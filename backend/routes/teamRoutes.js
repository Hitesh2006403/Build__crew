import express from "express";
import mongoose from "mongoose";
import Team from "../models/Team.js";
import Project from "../models/Project.js";
import Invitation from "../models/Invitation.js";
import Notification from "../models/Notification.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// GET /api/teams - Get teams for user's projects or where user is member
router.get("/", authenticateUser, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const teams = await Team.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .populate("project", "title categoryBadge type lead")
      .populate("owner", "name email avatar university role")
      .populate("members", "name email avatar university role skills")
      .sort({ createdAt: -1 });

    return res.json(teams);
  } catch (err) {
    return res.status(500).json({ error: "Could not retrieve teams.", details: err.message });
  }
});

// GET /api/teams/:id - Single team
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid team ID." });
    }

    const team = await Team.findById(id)
      .populate("project")
      .populate("owner", "name email avatar university role")
      .populate("members", "name email avatar university role skills");

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    return res.json(team);
  } catch (err) {
    return res.status(500).json({ error: "Error retrieving team.", details: err.message });
  }
});

// POST /api/teams - Create a new team
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { projectId, teamName, vacancies } = req.body;

    if (!projectId || !teamName) {
      return res.status(400).json({ error: "projectId and teamName are required." });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Associated project not found." });
    }

    const team = await Team.create({
      project: project._id,
      teamName: teamName.trim(),
      owner: req.user._id,
      members: [req.user._id],
      vacancies: Array.isArray(vacancies) ? vacancies : [],
      status: "active",
    });

    const populated = await Team.findById(team._id)
      .populate("project")
      .populate("owner", "name email avatar university role")
      .populate("members", "name email avatar university role");

    return res.status(201).json({ success: true, team: populated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create team.", details: err.message });
  }
});

// PUT /api/teams/:id - Update team
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only the team owner can edit team details." });
    }

    const { teamName, status, vacancies } = req.body;
    if (teamName) team.teamName = teamName.trim();
    if (status) team.status = status;
    if (vacancies) team.vacancies = vacancies;

    await team.save();
    return res.json({ success: true, team });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update team.", details: err.message });
  }
});

// DELETE /api/teams/:id - Delete team (Admin only)
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid team ID format." });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Administrator privileges required to delete teams." });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    // Delete associated invitations & notifications
    const invs = await Invitation.find({ team: team._id });
    const invIds = invs.map((i) => i._id.toString());
    await Notification.deleteMany({
      $or: [
        { relatedId: team._id.toString() },
        { relatedId: { $in: invIds } },
      ],
    });
    await Invitation.deleteMany({ team: team._id });
    await Team.findByIdAndDelete(id);

    return res.json({ success: true, message: "Team deleted successfully from MongoDB." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete team.", details: err.message });
  }
});

export default router;
