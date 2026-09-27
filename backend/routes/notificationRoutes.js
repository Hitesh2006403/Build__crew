import express from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// GET /api/notifications - Get notifications for authenticated user
router.get("/", authenticateUser, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 });
    return res.json(notifications);
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return res.status(500).json({ error: "Could not retrieve notifications.", details: err.message });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch("/:id/read", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notification ID." });
    }

    const notification = await Notification.findOne({ _id: id, recipient: req.user._id });
    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    notification.read = true;
    await notification.save();

    return res.json({ success: true, notification });
  } catch (err) {
    return res.status(500).json({ error: "Failed to mark notification as read.", details: err.message });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch("/read-all", authenticateUser, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update notifications.", details: err.message });
  }
});

export default router;
