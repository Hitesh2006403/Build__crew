import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dns from "dns";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import hackathonRoutes from "./routes/hackathonRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { verifyTeamMembership, verifyGroupMembership, getOrCreateCanonicalGroup } from "./utils/teamAuth.js";
import Message, { saveAndTrimMessage } from "./models/Message.js";
import ChatGroup from "./models/ChatGroup.js";

import Project from "./models/Project.js";
import Hackathon from "./models/Hackathon.js";
import HackathonTeam from "./models/HackathonTeam.js";
import User from "./models/User.js";
import { optionalAuth } from "./middleware/auth.js";
import { seedFounderAdmins } from "./seed.js";
import { runHackathonIngestion } from "./services/ingestion/syncService.js";

// Set reliable DNS servers for MongoDB Atlas SRV resolution
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  // Ignore if restricted
}

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS configuration allowing deployed frontend, preview deployments, and localhost
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("https://localhost:")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ---------------------------------------------------------------------------
// 🔌 HTTP Server & Socket.IO Real-Time Engine
// ---------------------------------------------------------------------------
const httpServer = createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || "buildcrew_super_secret_jwt_key_2026_secure";

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

app.set("io", io);

// Socket.IO authentication middleware (verifies JWT session)
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return next(new Error("Authentication error: Missing token"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.id === "admin-founder-env" || decoded._id === "admin-founder-env") {
      socket.user = {
        _id: "admin-founder-env",
        id: "admin-founder-env",
        email: decoded.email,
        name: decoded.name || "Administrator",
        role: "admin",
      };
      return next();
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id || decoded._id).select("-password");
      if (user) {
        socket.user = user;
        return next();
      }
    }

    if (decoded.role) {
      socket.user = {
        _id: decoded.id || decoded._id,
        id: decoded.id || decoded._id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      };
      return next();
    }

    return next(new Error("Authentication error: User account not found"));
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired session token"));
  }
});

// Socket.IO event listeners for Real-Time Chat & Collaboration
io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "userId:", socket.user?._id);

  // Join user's personal notification room
  if (socket.user?._id) {
    socket.join(`user:${socket.user._id}`);
  }

  // Unified Room Joining (supports join-chat, join_chat, join_group, join_team)
  const handleJoinChat = async (data, callback) => {
    try {
      const chatId = typeof data === "object" ? (data?.chatId || data?.groupId || data?.teamId || data?.id) : data;
      if (!chatId) {
        if (typeof callback === "function") callback({ error: "chatId or groupId is required." });
        return;
      }

      // 1. Check group membership
      let isGroup = true;
      let authCheck = await verifyGroupMembership(socket.user._id, chatId, socket.user.role);
      let roomTitle = authCheck.group?.name;

      // 2. If not a ChatGroup, check team membership
      if (!authCheck.valid) {
        const teamCheck = await verifyTeamMembership(socket.user._id, chatId, socket.user.role);
        if (teamCheck.valid) {
          authCheck = teamCheck;
          isGroup = false;
          roomTitle = teamCheck.teamName;
        }
      }

      if (!authCheck.valid) {
        if (typeof callback === "function") {
          callback({ error: authCheck.error || "Access denied: You are not a member of this chat room." });
        }
        return;
      }

      const idStr = String(chatId);
      socket.join(idStr);
      socket.join(`group:${idStr}`);
      socket.join(`team:${idStr}`);

      console.log(`[Socket] User ${socket.user?.name || socket.user?._id} joined chat room: ${idStr}`);

      if (typeof callback === "function") {
        callback({
          success: true,
          chatId: idStr,
          groupId: idStr,
          teamId: idStr,
          title: roomTitle,
          isGroup,
        });
      }
    } catch (err) {
      console.error("Socket join error:", err);
      if (typeof callback === "function") {
        callback({ error: "Could not join chat room." });
      }
    }
  };

  socket.on("join-chat", handleJoinChat);
  socket.on("join_chat", handleJoinChat);
  socket.on("join_group", handleJoinChat);
  socket.on("join_team", handleJoinChat);

  // Unified Room Leaving
  const handleLeaveChat = (data) => {
    const chatId = typeof data === "object" ? (data?.chatId || data?.groupId || data?.teamId || data?.id) : data;
    if (chatId) {
      const idStr = String(chatId);
      socket.leave(idStr);
      socket.leave(`group:${idStr}`);
      socket.leave(`team:${idStr}`);
    }
  };

  socket.on("leave-chat", handleLeaveChat);
  socket.on("leave_chat", handleLeaveChat);
  socket.on("leave_group", handleLeaveChat);
  socket.on("leave_team", handleLeaveChat);

  // Unified Message Sending & Real-time Broadcasting
  const handleSendMessage = async (data, callback) => {
    try {
      const { chatId: rawChatId, groupId: rawGroupId, teamId: rawTeamId, text: rawText, message: rawMessage } = data || {};
      const targetId = rawChatId || rawGroupId || rawTeamId;
      const text = rawText || rawMessage;

      if (!targetId) {
        if (typeof callback === "function") callback({ error: "chatId or groupId is required." });
        return;
      }

      if (!text || typeof text !== "string" || !text.trim()) {
        if (typeof callback === "function") callback({ error: "Message text cannot be empty." });
        return;
      }

      if (text.length > 1000) {
        if (typeof callback === "function") callback({ error: "Maximum message length is 1000 characters." });
        return;
      }

      // Check group membership first, then team membership
      let isGroup = true;
      let authCheck = await verifyGroupMembership(socket.user._id, targetId, socket.user.role);
      if (!authCheck.valid) {
        const teamCheck = await verifyTeamMembership(socket.user._id, targetId, socket.user.role);
        if (teamCheck.valid) {
          authCheck = teamCheck;
          isGroup = false;
        }
      }

      if (!authCheck.valid) {
        if (typeof callback === "function") {
          callback({ error: authCheck.error || "Access denied: You are not a member of this chat room." });
        }
        return;
      }

      // Resolve canonical conversation IDs and snapshot recipientIds (Points 3 & 4)
      let canonicalGroupId = isGroup ? targetId : undefined;
      let linkedTeamId = isGroup ? authCheck.group?.teamId : targetId;
      let recipientList = [];

      if (!isGroup) {
        const canonical = await getOrCreateCanonicalGroup(targetId).catch(() => null);
        if (canonical?._id) canonicalGroupId = canonical._id;
        recipientList = (authCheck.members || []).map((m) => String(m._id || m));
      } else {
        recipientList = (authCheck.group?.members || []).map((m) => String(m._id || m));
      }

      // Save message to existing database with snapshot recipients
      const savedMessage = await saveAndTrimMessage({
        groupId: canonicalGroupId,
        teamId: linkedTeamId,
        senderId: socket.user._id,
        text: text.trim(),
        recipientIds: recipientList,
      });

      const idStr = String(targetId);
      const targetRooms = [idStr, `group:${idStr}`, `team:${idStr}`];
      if (canonicalGroupId && String(canonicalGroupId) !== idStr) {
        const cStr = String(canonicalGroupId);
        targetRooms.push(cStr, `group:${cStr}`, `team:${cStr}`);
      }
      if (linkedTeamId && String(linkedTeamId) !== idStr) {
        const tStr = String(linkedTeamId);
        targetRooms.push(tStr, `group:${tStr}`, `team:${tStr}`);
      }

      // Broadcast saved message through WebSocket to all members in that room immediately
      io.to(targetRooms).emit("receive-message", savedMessage);
      io.to(targetRooms).emit("receive_message", savedMessage);
      io.to(targetRooms).emit("new_group_message", {
        groupId: idStr,
        chatId: idStr,
        message: savedMessage,
      });
      io.to(targetRooms).emit("new_message", savedMessage);

      // Background update of lastMessage on ChatGroup
      const targetGroupForUpdate = canonicalGroupId || (isGroup ? targetId : null);
      if (targetGroupForUpdate) {
        ChatGroup.findByIdAndUpdate(targetGroupForUpdate, {
          lastMessage: {
            text: text.trim().slice(0, 100),
            senderName: socket.user.name,
            senderUsername: socket.user.chatUsername || "",
            createdAt: savedMessage.createdAt || new Date(),
          },
        }).catch((e) => console.warn("[Socket] lastMessage update warning:", e.message));
      }

      if (typeof callback === "function") {
        callback({ success: true, message: savedMessage });
      }
    } catch (err) {
      console.error("Socket send message error:", err);
      if (typeof callback === "function") {
        callback({ error: "Message could not be sent. Please try again." });
      }
    }
  };

  socket.on("send-message", handleSendMessage);
  socket.on("send_message", handleSendMessage);
  socket.on("send_group_message", handleSendMessage);

  // Real-time Chat Delivery Receipt tracking (Point 4)
  socket.on("message_delivered", async (data) => {
    try {
      const { messageId, messageIds } = typeof data === "object" ? data : { messageId: data };
      const ids = messageIds || (messageId ? [messageId] : []);
      const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (!validIds.length || !socket.user?._id) return;
      const now = new Date();
      const msgs = await Message.find({
        _id: { $in: validIds },
        "recipients.userId": socket.user._id,
        "recipients.delivered": false,
      });
      for (const m of msgs) {
        const r = m.recipients.find((rec) => String(rec.userId) === String(socket.user._id));
        if (r) {
          r.delivered = true;
          r.deliveredAt = now;
          await m.save();
          const convId = m.conversationId || String(m.groupId || m.teamId);
          const updatePayload = {
            messageId: String(m._id),
            conversationId: convId,
            recipientId: String(socket.user._id),
            status: "delivered",
            recipients: m.recipients,
          };
          const senderIdStr = String(m.senderId?._id || m.senderId);
          io.to(`user:${senderIdStr}`).emit("receipt_updated", updatePayload);
          io.to([convId, `group:${convId}`, `team:${convId}`]).emit("receipt_updated", updatePayload);
        }
      }
    } catch (e) {
      console.warn("[Socket] message_delivered error:", e.message);
    }
  });

  // Real-time Chat Read Receipt tracking (Point 4: never turn blue just because sender opened chat)
  socket.on("conversation_read", async (data) => {
    try {
      const { conversationId, messageIds } = typeof data === "object" ? data : { conversationId: data };
      if (!socket.user?._id) return;
      const now = new Date();
      let query = { "recipients.userId": socket.user._id, "recipients.read": false };
      if (Array.isArray(messageIds) && messageIds.length > 0) {
        query._id = { $in: messageIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) };
      } else if (conversationId) {
        const convStr = String(conversationId);
        const isOid = mongoose.Types.ObjectId.isValid(convStr);
        query.$or = [
          { conversationId: convStr },
          isOid ? { groupId: convStr } : null,
          isOid ? { teamId: convStr } : null,
        ].filter(Boolean);
      } else {
        return;
      }
      const msgs = await Message.find(query);
      for (const m of msgs) {
        const r = m.recipients.find((rec) => String(rec.userId) === String(socket.user._id));
        if (r) {
          r.delivered = true;
          r.deliveredAt = r.deliveredAt || now;
          r.read = true;
          r.readAt = now;
          await m.save();
          const convId = m.conversationId || String(m.groupId || m.teamId);
          const updatePayload = {
            messageId: String(m._id),
            conversationId: convId,
            recipientId: String(socket.user._id),
            status: "read",
            recipients: m.recipients,
          };
          const senderIdStr = String(m.senderId?._id || m.senderId);
          io.to(`user:${senderIdStr}`).emit("receipt_updated", updatePayload);
          io.to([convId, `group:${convId}`, `team:${convId}`]).emit("receipt_updated", updatePayload);
        }
      }
    } catch (e) {
      console.warn("[Socket] conversation_read error:", e.message);
    }
  });

  // Handle socket disconnection properly
  socket.on("disconnect", (reason) => {
    console.log("User disconnected:", socket.id, "reason:", reason);
  });
});

// ---------------------------------------------------------------------------
// 🔌 MongoDB Connection Helper (Cached for Serverless & Standalone)
// ---------------------------------------------------------------------------
let isConnecting = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (!isConnecting) {
    const mongoURI = (process.env.MONGODB_URI || "").trim();
    if (!mongoURI) {
      console.error("MONGODB_URI is not set in environment variables!");
      throw new Error("MONGODB_URI is not set in environment variables");
    }
    isConnecting = mongoose
      .connect(mongoURI)
      .then(async () => {
        console.log("Connected to MongoDB Atlas");
        try {
          await seedFounderAdmins();
        } catch (seedErr) {
          console.warn("Founder admin seed warning:", seedErr.message);
        }
      })
      .catch((err) => {
        isConnecting = null;
        console.error("MongoDB connection error:", err.message);
        throw err;
      });
  }
  await isConnecting;
};

// Database connection middleware: ensures DB is connected before handling any route
app.use(async (req, res, next) => {
  if (req.path === "/" || req.path === "/health" || req.path === "/api/health") {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    return res.status(503).json({
      error: "Database is unavailable. Please check MONGODB_URI configuration.",
      details: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// 🩺 Health check endpoint
// ---------------------------------------------------------------------------
const healthHandler = (req, res) => {
  res.json({
    status: "online",
    message: "BuildCrew MERN Backend API is running.",
    database: mongoose.connection.readyState === 1 ? "Connected to MongoDB" : "Disconnected",
  });
};

app.get("/", healthHandler);
app.get("/health", healthHandler);

// ---------------------------------------------------------------------------
// 🚀 REST API Modular Routes
// ---------------------------------------------------------------------------
const apiRouter = express.Router();
apiRouter.get("/health", healthHandler);
apiRouter.get("/", healthHandler);

// 📦 Bootstrap Route - Hydrates initial platform state directly from MongoDB
apiRouter.get("/bootstrap", optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        data: {
          projects: [],
          hackathons: [],
          squadWins: [],
          builders: [],
          hackathonSquads: [],
        },
      });
    }

    const isAdmin = req.user && req.user.role === "admin";
    const hackathonQuery = isAdmin ? {} : { isPublished: true };

    // Performance optimization: send lean projects for first screen;
    // Hackathons and builder directories are hydrated on-demand when opened (Waterfal Optimization)
    const [projects, builders, hackathonSquads] = await Promise.all([
      Project.find()
        .populate("createdBy", "name email avatar profileImage college university role roleTitle github linkedin")
        .populate("members", "name email avatar profileImage college university role roleTitle github linkedin")
        .sort({ createdAt: -1 })
        .lean(),
      User.find()
        .select("name avatar role roleTitle college university branch skills")
        .limit(40)
        .sort({ createdAt: -1 })
        .lean(),
      HackathonTeam.find().populate("createdBy", "name avatar profileImage").sort({ createdAt: -1 }).lean(),
    ]);

    const cleanBuilders = (builders || []).map((u) => {
      let avatar = u.avatar || "";
      if (u.profileImage && !u.profileImage.startsWith("data:") && !avatar) {
        avatar = u.profileImage;
      }
      return {
        ...u,
        avatar,
        profileImage: avatar,
      };
    });

    const cleanProjects = (projects || []).map((p) => {
      let cleanImage = p.image || "";
      if (cleanImage.startsWith("data:") && cleanImage.length > 2000) {
        cleanImage = "";
      }
      const cleanCreatedBy = p.createdBy
        ? {
            ...p.createdBy,
            avatar: p.createdBy.avatar || (p.createdBy.profileImage && !p.createdBy.profileImage.startsWith("data:") ? p.createdBy.profileImage : ""),
            profileImage: p.createdBy.avatar || (p.createdBy.profileImage && !p.createdBy.profileImage.startsWith("data:") ? p.createdBy.profileImage : ""),
          }
        : p.createdBy;
      const cleanMembers = (p.members || []).map((m) => {
        if (!m) return m;
        const av = m.avatar || (m.profileImage && !m.profileImage.startsWith("data:") ? m.profileImage : "");
        return { ...m, avatar: av, profileImage: av };
      });
      return {
        ...p,
        image: cleanImage,
        createdBy: cleanCreatedBy,
        members: cleanMembers,
      };
    });

    return res.json({
      success: true,
      data: {
        projects: cleanProjects,
        hackathons: [], // Loaded on-demand when user opens Hackathons
        squadWins: [],
        builders: cleanBuilders,
        hackathonSquads,
      },
    });
  } catch (err) {
    console.error("Bootstrap data error:", err);
    return res.status(500).json({ error: "Failed to hydrate platform data from MongoDB.", details: err.message });
  }
});

// Modular sub-routes
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/projects", projectRoutes);
apiRouter.use("/applications", applicationRoutes);
apiRouter.use("/teams", teamRoutes);
apiRouter.use("/invitations", invitationRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/hackathons", hackathonRoutes);
apiRouter.use("/chat", chatRoutes);

// 👥 Builders & Squads Endpoints (Synced with MongoDB)
apiRouter.get("/builders", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const builders = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(builders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch builders from MongoDB." });
  }
});

apiRouter.post("/builders", async (req, res) => {
  try {
    const { name, role, university, year, skills, avatar, lookingFor } = req.body;
    const cleanEmail = `builder-${Date.now()}@buildcrew.local`;
    const newBuilder = await User.create({
      name: name || "Anonymous Builder",
      email: cleanEmail,
      password: "auto-generated-not-for-login",
      roleTitle: role || "Software Engineer",
      university: university || "",
      college: university || "",
      year: year || "'26",
      skills: Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s) => s.trim()) : [],
      avatar: avatar || "",
      profileImage: avatar || "",
      lookingFor: lookingFor || "",
      role: "student",
    });
    res.status(201).json({ message: "Builder added successfully", builder: newBuilder });
  } catch (err) {
    res.status(500).json({ error: "Failed to create builder in MongoDB", details: err.message });
  }
});

apiRouter.get("/squad-wins", (req, res) => {
  res.json([]);
});

apiRouter.get("/hackathon-squads", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const squads = await HackathonTeam.find().populate("createdBy", "name email avatar profileImage").sort({ createdAt: -1 });
    res.json(squads);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hackathon squads from MongoDB." });
  }
});

// Mount routes at both /api and root (for environments/rewrites with or without /api prefix)
app.use("/api", apiRouter);
app.use(apiRouter);

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Server Error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ---------------------------------------------------------------------------
// 🔌 Standalone Server Initialization (Local Development)
// ---------------------------------------------------------------------------
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(`server is running on port ${PORT}`);

        // Automated Background Ingestion for Karnataka Hackathons.
        // Set DISABLE_HACKATHON_SYNC=true to skip it (e.g. environments
        // without outbound network access). Chat, auth, and all other
        // features are unaffected by this flag.
        if (process.env.DISABLE_HACKATHON_SYNC === "true") {
          console.log("[Scheduler] Background hackathon sync disabled (DISABLE_HACKATHON_SYNC=true).");
          return;
        }

        setTimeout(() => {
          console.log("[Scheduler] Initiating automatic startup sync for Karnataka hackathons...");
          runHackathonIngestion().catch((err) => {
            console.warn("[Scheduler] Startup Karnataka hackathon sync warning:", err.message);
          });
        }, 10000);

        const SIX_HOURS = 6 * 60 * 60 * 1000;
        setInterval(() => {
          console.log("[Scheduler] Running scheduled recurring sync for Karnataka hackathons...");
          runHackathonIngestion().catch((err) => {
            console.warn("[Scheduler] Recurring Karnataka hackathon sync warning:", err.message);
          });
        }, SIX_HOURS);
      });
    })
    .catch((err) => {
      console.error("MongoDB initial connection error:", err.message);
    });
}

export { httpServer, io };
export default app;
