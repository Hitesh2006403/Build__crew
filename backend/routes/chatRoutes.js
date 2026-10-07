import express from "express";
import Message, { saveAndTrimMessage } from "../models/Message.js";
import { authenticateUser } from "../middleware/auth.js";
import { verifyTeamMembership } from "../utils/teamAuth.js";

const router = express.Router();

// GET /api/chat/:teamId/messages - Load existing chat history from MongoDB
router.get("/:teamId/messages", authenticateUser, async (req, res) => {
  try {
    const { teamId } = req.params;
    const authCheck = await verifyTeamMembership(req.user._id, teamId, req.user.role);

    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || "Access denied: You are not a member of this team." });
    }

    const messages = await Message.find({ teamId })
      .populate("senderId", "name email avatar profileImage role roleTitle college university")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      teamId,
      teamName: authCheck.teamName,
      members: authCheck.members,
      messages,
    });
  } catch (err) {
    console.error("Fetch team chat messages error:", err);
    return res.status(500).json({ error: "Could not retrieve chat messages.", details: err.message });
  }
});

// POST /api/chat/:teamId/messages - Send text message to team (REST fallback / direct)
router.post("/:teamId/messages", authenticateUser, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { text } = req.body;

    const authCheck = await verifyTeamMembership(req.user._id, teamId, req.user.role);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || "Access denied: You are not a member of this team." });
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: "Message cannot exceed 1000 characters." });
    }

    // Persist to MongoDB with 500-message retention & 30-day TTL protection
    const savedMessage = await saveAndTrimMessage({
      teamId,
      senderId: req.user._id,
      text,
    });

    // Broadcast saved message to other team members via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`team:${teamId}`).emit("new_message", savedMessage);
    }

    return res.status(201).json({
      success: true,
      message: savedMessage,
    });
  } catch (err) {
    console.error("Send team chat message error:", err);
    return res.status(500).json({ error: "Message could not be sent. Please try again.", details: err.message });
  }
});

// GET /api/chat/:teamId/details - Retrieve team details and member list for chat header
router.get("/:teamId/details", authenticateUser, async (req, res) => {
  try {
    const { teamId } = req.params;
    const authCheck = await verifyTeamMembership(req.user._id, teamId, req.user.role);

    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || "Access denied: You are not a member of this team." });
    }

    return res.json({
      success: true,
      teamId: authCheck.teamId,
      teamName: authCheck.teamName,
      members: authCheck.members,
    });
  } catch (err) {
    console.error("Get team chat details error:", err);
    return res.status(500).json({ error: "Could not retrieve team details.", details: err.message });
  }
});

export default router;
