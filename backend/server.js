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

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import hackathonRoutes from "./routes/hackathonRoutes.js";

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

    const [projects, hackathons, builders, hackathonSquads] = await Promise.all([
      Project.find()
        .populate("createdBy", "name email avatar profileImage college university role roleTitle github linkedin showEmailToTeam")
        .populate("members", "name email avatar profileImage college university role roleTitle github linkedin showEmailToTeam")
        .sort({ createdAt: -1 })
        .lean(),
      Hackathon.find(hackathonQuery).sort({ createdAt: -1 }).lean(),
      User.find().select("-password").sort({ createdAt: -1 }).lean(),
      HackathonTeam.find().populate("createdBy", "name email avatar profileImage").sort({ createdAt: -1 }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        projects,
        hackathons,
        squadWins: [],
        builders,
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
      app.listen(PORT, () => {
        console.log(`server is running on port ${PORT}`);

        // Automated Background Ingestion for Karnataka Hackathons
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

export default app;
