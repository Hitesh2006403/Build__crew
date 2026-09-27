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

// Set reliable DNS servers for MongoDB Atlas SRV resolution
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  // Ignore if restricted
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ---------------------------------------------------------------------------
// 🩺 Health check endpoint
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "BuildCrew MERN Backend API is running.",
    database: mongoose.connection.readyState === 1 ? "Connected to MongoDB" : "Disconnected",
  });
});

// ---------------------------------------------------------------------------
// 📦 Bootstrap Route - Hydrates initial platform state directly from MongoDB
// ---------------------------------------------------------------------------
app.get("/api/bootstrap", optionalAuth, async (req, res) => {
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
        .populate("createdBy", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
        .populate("members", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
        .sort({ createdAt: -1 }),
      Hackathon.find(hackathonQuery).sort({ createdAt: -1 }),
      User.find().select("-password").sort({ createdAt: -1 }),
      HackathonTeam.find().populate("createdBy", "name email avatar").sort({ createdAt: -1 }),
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

// ---------------------------------------------------------------------------
// 🚀 REST API Modular Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hackathons", hackathonRoutes);

// ---------------------------------------------------------------------------
// 👥 Builders & Squads Endpoints (Synced with MongoDB)
// ---------------------------------------------------------------------------
app.get("/api/builders", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const builders = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(builders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch builders from MongoDB." });
  }
});

app.post("/api/builders", async (req, res) => {
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

app.get("/api/squad-wins", (req, res) => {
  res.json([]);
});

app.get("/api/hackathon-squads", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const squads = await HackathonTeam.find().populate("createdBy", "name email avatar").sort({ createdAt: -1 });
    res.json(squads);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hackathon squads from MongoDB." });
  }
});

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
// 🔌 MongoDB Connection & Server Initialization
// ---------------------------------------------------------------------------
const mongoURI = (process.env.MONGODB_URI || "").trim();

if (!mongoURI) {
  console.error("MONGODB_URI is not set in backend/.env!");
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(async () => {
    await seedFounderAdmins();
    app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
      console.log("Connected to MongoDB");
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });
