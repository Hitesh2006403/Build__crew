import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Project from "../models/Project.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// GET /api/users - Browse & discover students / builders
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const { search, skill, role } = req.query;
    const query = {};

    // Filter by role if specified, default to student builders if browsing
    if (role && role !== "all") {
      query.role = role;
    }

    if (skill && skill.trim()) {
      query.skills = { $regex: new RegExp(skill.trim(), "i") };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: "i" } },
        { university: { $regex: s, $options: "i" } },
        { college: { $regex: s, $options: "i" } },
        { branch: { $regex: s, $options: "i" } },
        { skills: { $regex: s, $options: "i" } },
        { bio: { $regex: s, $options: "i" } },
        { roleTitle: { $regex: s, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    return res.status(500).json({ error: "Could not retrieve users.", details: err.message });
  }
});

// GET /api/users/:id - Fetch individual student profile
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Error fetching user profile.", details: err.message });
  }
});

// PUT /api/users/:id - Update user profile (Self or Admin)
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    // Only allow updating own account unless admin
    if (req.user._id.toString() !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You can only edit your own profile." });
    }

    const allowedUpdates = [
      "name",
      "email",
      "college",
      "university",
      "branch",
      "major",
      "semester",
      "graduationYear",
      "year",
      "bio",
      "skills",
      "interests",
      "lookingFor",
      "github",
      "linkedin",
      "showEmailToTeam",
      "profileImage",
      "avatar",
      "roleTitle",
      "chatUsername",
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === "skills" || key === "interests") {
          updates[key] = Array.isArray(req.body[key])
            ? req.body[key]
            : typeof req.body[key] === "string"
            ? req.body[key].split(",").map((s) => s.trim()).filter(Boolean)
            : [];
        } else if (key === "showEmailToTeam") {
          updates[key] = Boolean(req.body[key]);
        } else if (key === "email") {
          updates[key] = String(req.body[key]).trim().toLowerCase();
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    // Keep avatar and profileImage in sync
    if (updates.profileImage && !updates.avatar) updates.avatar = updates.profileImage;
    if (updates.avatar && !updates.profileImage) updates.profileImage = updates.avatar;

    const updatedUser = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    // Synchronize lead avatar on all Projects created by this user in MongoDB
    if (updates.avatar || updates.profileImage) {
      const newAvatar = updates.avatar || updates.profileImage;
      try {
        await Project.updateMany(
          { createdBy: id },
          { $set: { "lead.avatar": newAvatar, "lead.leadAvatarFull": newAvatar } }
        );
      } catch (projErr) {
        console.warn("Failed to synchronize lead avatar on projects:", projErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Error updating profile.", details: err.message });
  }
});

export default router;
