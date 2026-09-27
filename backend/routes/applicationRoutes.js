import express from "express";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import Project from "../models/Project.js";
import Notification from "../models/Notification.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// GET /api/applications - Get all relevant applications for authenticated user
router.get("/", authenticateUser, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    // Find projects owned by user
    const ownedProjects = await Project.find({ createdBy: req.user._id }).select("_id");
    const ownedProjectIds = ownedProjects.map((p) => p._id);

    // Applications either created by user OR submitted to user's projects
    const applications = await Application.find({
      $or: [{ applicant: req.user._id }, { project: { $in: ownedProjectIds } }],
    })
      .populate("project", "title categoryBadge type lead")
      .populate("applicant", "name email avatar university role skills")
      .sort({ createdAt: -1 });

    return res.json(applications);
  } catch (err) {
    console.error("Fetch applications error:", err);
    return res.status(500).json({ error: "Could not retrieve applications.", details: err.message });
  }
});

// POST /api/applications - Apply to join a project
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { projectId, project: bodyProject, role, requestedRole, message, note } = req.body;
    const targetProjectId = projectId || bodyProject;
    const targetRole = role || requestedRole || "Core Squad Engineer";

    if (!targetProjectId || !mongoose.Types.ObjectId.isValid(targetProjectId)) {
      return res.status(400).json({ error: "Valid projectId is required." });
    }

    const project = await Project.findById(targetProjectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found in database." });
    }

    // Rule: Cannot apply to own project
    if (project.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot apply to your own project." });
    }

    // Rule: Cannot apply if already a member
    if (project.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(400).json({ error: "You are already a member of this project." });
    }

    // Rule: Cannot apply twice to same project with pending application
    const existingApp = await Application.findOne({
      project: project._id,
      applicant: req.user._id,
      status: "pending",
    });

    if (existingApp) {
      return res.status(409).json({ error: "You already have a pending application for this project." });
    }

    const newApp = await Application.create({
      project: project._id,
      applicant: req.user._id,
      projectTitle: project.title,
      applicantName: req.user.name,
      applicantEmail: req.user.email,
      applicantAvatar: req.user.avatar || req.user.profileImage,
      requestedRole: targetRole,
      role: targetRole,
      message: message || note || `Applied to join ${project.title} as ${targetRole}.`,
      note: note || message || "",
      status: "pending",
      statusColor: "bg-secondary-fixed text-on-secondary-fixed",
      submittedAt: "Just now",
    });

    // Create Notification for the project owner in MongoDB
    await Notification.create({
      recipient: project.createdBy,
      type: "application_received",
      title: "New Project Application",
      message: `${req.user.name} applied for "${targetRole}" in your project "${project.title}".`,
      relatedId: newApp._id.toString(),
      read: false,
    });

    const populated = await Application.findById(newApp._id)
      .populate("project", "title categoryBadge type lead")
      .populate("applicant", "name email avatar university role");

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully to MongoDB.",
      application: populated,
    });
  } catch (err) {
    console.error("Apply error:", err);
    return res.status(500).json({ error: "Failed to submit project application.", details: err.message });
  }
});

// PATCH /api/applications/:id/status - Accept or reject application (Project owner only)
router.patch("/:id/status", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected", "withdrawn"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const application = await Application.findById(id).populate("project");
    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    const project = application.project;
    // Check permission: only project owner or admin can accept/reject; applicant can withdraw
    const isOwner = project.createdBy.toString() === req.user._id.toString();
    const isApplicant = application.applicant.toString() === req.user._id.toString();

    if (status === "withdrawn") {
      if (!isApplicant && !isOwner) {
        return res.status(403).json({ error: "Forbidden: You cannot withdraw this application." });
      }
    } else {
      if (!isOwner && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Only the project owner can accept or reject applications." });
      }
    }

    application.status = status;
    application.statusColor =
      status === "accepted"
        ? "bg-emerald-100 text-emerald-800"
        : status === "rejected"
        ? "bg-rose-100 text-rose-800"
        : "bg-surface-container text-on-surface-variant";
    await application.save();

    // If accepted: add applicant to project members in MongoDB
    if (status === "accepted") {
      if (!project.members.map((m) => m.toString()).includes(application.applicant.toString())) {
        project.members.push(application.applicant);
        project.filledCount = Math.min(project.totalCapacity, (project.filledCount || 1) + 1);
        await project.save();
      }

      // Notify the applicant
      await Notification.create({
        recipient: application.applicant,
        type: "application_accepted",
        title: "Application Accepted! 🎉",
        message: `Your application for "${application.requestedRole}" in "${project.title}" has been accepted! You are now part of the squad.`,
        relatedId: project._id.toString(),
        read: false,
      });
    } else if (status === "rejected") {
      await Notification.create({
        recipient: application.applicant,
        type: "application_rejected",
        title: "Application Status Update",
        message: `Your application for "${application.requestedRole}" in "${project.title}" was not selected.`,
        relatedId: project._id.toString(),
        read: false,
      });
    }

    return res.json({
      success: true,
      message: `Application marked as ${status}.`,
      application,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update application status.", details: err.message });
  }
});

// DELETE /api/applications/:id - Withdraw / delete application
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const appDoc = await Application.findById(id);
    if (!appDoc) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (appDoc.applicant.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You can only remove your own applications." });
    }

    await Application.findByIdAndDelete(id);
    return res.json({ success: true, message: "Application removed." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete application.", details: err.message });
  }
});

export default router;
