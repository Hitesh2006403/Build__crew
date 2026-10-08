import express from "express";
import Message, { saveAndTrimMessage } from "../models/Message.js";
import ChatGroup from "../models/ChatGroup.js";
import User from "../models/User.js";
import { authenticateUser } from "../middleware/auth.js";
import {
  verifyTeamMembership,
  verifyGroupMembership,
  getUserFormedTeams,
  getOrCreateCanonicalGroup,
} from "../utils/teamAuth.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// 👤 Chat Username Handle Management
// ---------------------------------------------------------------------------

// PUT /api/chat/username - Allows team member to create or update their unique chat username
router.put("/username", authenticateUser, async (req, res) => {
  try {
    let { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required." });
    }

    username = username.trim().replace(/^@+/, ""); // strip leading @

    // Validate format: 3-25 alphanumeric and underscore characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,25}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: "Username must be 3-25 characters long and contain only letters, numbers, and underscores.",
      });
    }

    // Check if another user already has this chat username
    const existing = await User.findOne({
      chatUsername: { $regex: new RegExp(`^${username}$`, "i") },
      _id: { $ne: req.user._id },
    });

    if (existing) {
      return res.status(409).json({ error: "Username is already taken by another builder." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { chatUsername: username },
      { new: true }
    ).select("-password");

    return res.json({
      success: true,
      message: "Chat username updated successfully.",
      user: updatedUser,
      chatUsername: username,
    });
  } catch (err) {
    console.error("Update chat username error:", err);
    return res.status(500).json({ error: "Could not update chat username.", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 👥 Formed Teams Discovery for Group Creation
// ---------------------------------------------------------------------------

// GET /api/chat/user-teams - Returns all teams formed by or joined by the user for group creation
router.get("/user-teams", authenticateUser, async (req, res) => {
  try {
    const teams = await getUserFormedTeams(req.user._id);
    return res.json({
      success: true,
      teams,
    });
  } catch (err) {
    console.error("Fetch user teams for chat error:", err);
    return res.status(500).json({ error: "Could not fetch user teams.", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 💬 WhatsApp-style Team Chat Groups
// ---------------------------------------------------------------------------

// GET /api/chat/groups - Returns all groups the current user belongs to or created (Point 3: canonical chats)
router.get("/groups", authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id;

    // Automatically ensure canonical chat group exists for every team user belongs to (Point 3)
    try {
      const userTeams = await getUserFormedTeams(userId);
      for (const t of userTeams || []) {
        if (t.teamId) {
          await getOrCreateCanonicalGroup(t.teamId).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[Chat] Auto-canonical sync warning:", e.message);
    }

    const groups = await ChatGroup.find({
      $or: [{ members: userId }, { admin: userId }],
    })
      .populate("admin", "name email avatar profileImage chatUsername role roleTitle college university")
      .populate("members", "name email avatar profileImage chatUsername role roleTitle college university")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      groups,
    });
  } catch (err) {
    console.error("Fetch chat groups error:", err);
    return res.status(500).json({ error: "Could not load chat groups.", details: err.message });
  }
});

// POST /api/chat/groups - Team admin/lead creates a new group for their formed team
router.post("/groups", authenticateUser, async (req, res) => {
  try {
    const { name, description, groupProfilePic, teamId, memberIds = [] } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Group name is required." });
    }

    if (name.trim().length > 60) {
      return res.status(400).json({ error: "Group name cannot exceed 60 characters." });
    }

    let teamName = "Team Squad";
    let teamType = "Custom";
    let allowedMemberIds = new Set([String(req.user._id)]);

    // If linked to a team, verify membership & authorize member selection
    if (teamId) {
      const authCheck = await verifyTeamMembership(req.user._id, teamId, req.user.role);
      if (!authCheck.valid) {
        return res.status(403).json({ error: "You can only create groups for teams you are a part of." });
      }

      teamName = authCheck.teamName || "Team Squad";
      teamType = authCheck.entityType || "Project";

      // Populate valid members from that team
      (authCheck.members || []).forEach((m) => {
        allowedMemberIds.add(String(m._id || m));
      });
    }

    // Filter requested memberIds so only valid team members are added
    const initialMembers = new Set([String(req.user._id)]);
    if (Array.isArray(memberIds)) {
      for (const mId of memberIds) {
        const idStr = String(mId);
        if (allowedMemberIds.has(idStr)) {
          initialMembers.add(idStr);
        }
      }
    }

    const newGroup = await ChatGroup.create({
      name: name.trim(),
      description: (description || "").trim().slice(0, 200),
      // Group Profile Picture is the only media permitted
      groupProfilePic: groupProfilePic || "",
      teamId: teamId || undefined,
      teamName,
      teamType,
      admin: req.user._id,
      members: Array.from(initialMembers),
      lastMessage: {
        text: `Group created by ${req.user.name}`,
        senderName: "System",
        senderUsername: "system",
        createdAt: new Date(),
      },
    });

    // Populate in place (single round-trip) instead of a second findById query.
    await newGroup.populate([
      { path: "admin", select: "name email avatar profileImage chatUsername role roleTitle college university" },
      { path: "members", select: "name email avatar profileImage chatUsername role roleTitle college university" },
    ]);
    const populatedGroup = newGroup.toObject();

    // Broadcast new group creation to all group members via Socket.IO
    const io = req.app.get("io");
    if (io) {
      for (const member of populatedGroup.members || []) {
        io.to(`user:${member._id}`).emit("group_created", populatedGroup);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Group created successfully.",
      group: populatedGroup,
    });
  } catch (err) {
    console.error("Create chat group error:", err);
    return res.status(500).json({ error: "Failed to create group.", details: err.message });
  }
});

// GET /api/chat/groups/:groupId/messages - Load messages for a group (Point 3: canonical messages)
router.get("/groups/:groupId/messages", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const authCheck = await verifyGroupMembership(req.user._id, groupId, req.user.role);

    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error });
    }

    // Canonical matching: if group is linked to a team, retrieve messages sent via teamId or groupId
    const filter = (authCheck.group && authCheck.group.teamId)
      ? { $or: [{ groupId }, { teamId: authCheck.group.teamId }] }
      : { groupId };

    const messages = await Message.find(filter)
      .populate("senderId", "name email avatar profileImage chatUsername role roleTitle college university")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    return res.json({
      success: true,
      groupId,
      group: authCheck.group,
      messages,
      isGroupAdmin: authCheck.isGroupAdmin,
    });
  } catch (err) {
    console.error("Fetch group messages error:", err);
    return res.status(500).json({ error: "Could not retrieve group messages.", details: err.message });
  }
});

// POST /api/chat/groups/:groupId/messages - Send text message to group (Point 3: canonical, Point 4: receipts)
router.post("/groups/:groupId/messages", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;

    const authCheck = await verifyGroupMembership(req.user._id, groupId, req.user.role);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error });
    }

    // Strictly plain text only: no files, no photos, no videos, no pdfs, no stickers, no gifs
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: "Message cannot exceed 1000 characters." });
    }

    const linkedTeamId = authCheck.group?.teamId;
    const recipientIds = (authCheck.group?.members || []).map((m) => String(m._id || m));

    // Save with 500-message retention, 30-day TTL storage protection, and snapshot recipients
    const savedMessage = await saveAndTrimMessage({
      groupId,
      teamId: linkedTeamId || undefined,
      senderId: req.user._id,
      text,
      recipientIds,
      replyTo: req.body.replyTo || null,
    });

    // Broadcast saved message through WebSocket to all members in that room immediately
    const io = req.app.get("io");
    if (io) {
      const idStr = String(groupId);
      const rooms = [idStr, `group:${idStr}`, `team:${idStr}`];
      if (linkedTeamId) {
        const teamIdStr = String(linkedTeamId);
        rooms.push(teamIdStr, `group:${teamIdStr}`, `team:${teamIdStr}`);
      }
      io.to(rooms).emit("receive-message", savedMessage);
      io.to(rooms).emit("receive_message", savedMessage);
      io.to(rooms).emit("new_group_message", {
        groupId: idStr,
        chatId: idStr,
        message: savedMessage,
      });
      io.to(rooms).emit("new_message", savedMessage);
    }

    ChatGroup.findByIdAndUpdate(groupId, {
      lastMessage: {
        text: text.trim().slice(0, 100),
        senderName: req.user.name,
        senderUsername: req.user.chatUsername || "",
        createdAt: savedMessage.createdAt || new Date(),
      },
    }).catch((e) => console.warn("[Chat] lastMessage update warning:", e.message));

    return res.status(201).json({
      success: true,
      message: savedMessage,
    });
  } catch (err) {
    console.error("Send group message error:", err);
    return res.status(500).json({ error: "Message could not be sent.", details: err.message });
  }
});

// POST /api/chat/groups/:groupId/members - Group admin adds teammates to group
router.post("/groups/:groupId/members", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;

    const authCheck = await verifyGroupMembership(req.user._id, groupId, req.user.role);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error });
    }

    if (!authCheck.isGroupAdmin) {
      return res.status(403).json({ error: "Only the group admin can add members to this group." });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "memberIds must be a non-empty array." });
    }

    const group = authCheck.group;

    // If group has teamId, verify that the added members belong to that team
    let validMemberIdsToAdd = memberIds;
    if (group.teamId) {
      const teamCheck = await verifyTeamMembership(req.user._id, group.teamId, req.user.role);
      if (teamCheck.valid) {
        const allowed = new Set((teamCheck.members || []).map((m) => String(m._id || m)));
        validMemberIdsToAdd = memberIds.filter((id) => allowed.has(String(id)));
      }
    }

    const updatedGroup = await ChatGroup.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { members: { $each: validMemberIdsToAdd } },
      },
      { new: true }
    )
      .populate("admin", "name email avatar profileImage chatUsername role roleTitle college university")
      .populate("members", "name email avatar profileImage chatUsername role roleTitle college university")
      .lean();

    // Broadcast update via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`group:${groupId}`).emit("group_members_updated", updatedGroup);
    }

    return res.json({
      success: true,
      message: "Members added successfully.",
      group: updatedGroup,
    });
  } catch (err) {
    console.error("Add group members error:", err);
    return res.status(500).json({ error: "Could not add group members.", details: err.message });
  }
});

// PUT /api/chat/groups/:groupId - Group admin updates group profile picture or name
router.put("/groups/:groupId", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, groupProfilePic } = req.body;

    const authCheck = await verifyGroupMembership(req.user._id, groupId, req.user.role);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error });
    }

    if (!authCheck.isGroupAdmin) {
      return res.status(403).json({ error: "Only the group admin can update group details." });
    }

    const updates = {};
    if (name && typeof name === "string") updates.name = name.trim().slice(0, 60);
    if (description !== undefined) updates.description = String(description).trim().slice(0, 200);
    if (groupProfilePic !== undefined) updates.groupProfilePic = String(groupProfilePic);

    const updatedGroup = await ChatGroup.findByIdAndUpdate(groupId, updates, { new: true })
      .populate("admin", "name email avatar profileImage chatUsername role roleTitle college university")
      .populate("members", "name email avatar profileImage chatUsername role roleTitle college university")
      .lean();

    // Broadcast update via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`group:${groupId}`).emit("group_updated", updatedGroup);
    }

    return res.json({
      success: true,
      message: "Group updated successfully.",
      group: updatedGroup,
    });
  } catch (err) {
    console.error("Update group error:", err);
    return res.status(500).json({ error: "Could not update group.", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 📦 Team Chat (Preserved from Previous Version)
// ---------------------------------------------------------------------------

// GET /api/chat/:teamId/messages - Load existing chat history from MongoDB (Point 3: canonical messages)
router.get("/:teamId/messages", authenticateUser, async (req, res) => {
  try {
    const { teamId } = req.params;
    const authCheck = await verifyTeamMembership(req.user._id, teamId, req.user.role);

    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || "Access denied: You are not a member of this team." });
    }

    // Ensure canonical group exists and link conversation
    const canonicalGroup = await getOrCreateCanonicalGroup(teamId).catch(() => null);

    const filter = canonicalGroup
      ? { $or: [{ teamId }, { groupId: canonicalGroup._id }] }
      : { teamId };

    const messages = await Message.find(filter)
      .populate("senderId", "name email avatar profileImage chatUsername role roleTitle college university")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    return res.json({
      success: true,
      teamId,
      canonicalGroupId: canonicalGroup?._id || null,
      teamName: authCheck.teamName,
      members: authCheck.members,
      messages,
    });
  } catch (err) {
    console.error("Fetch team chat messages error:", err);
    return res.status(500).json({ error: "Could not retrieve chat messages.", details: err.message });
  }
});

// POST /api/chat/:teamId/messages - Send text message to team (Point 3: canonical, Point 4: receipts)
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

    const canonicalGroup = await getOrCreateCanonicalGroup(teamId).catch(() => null);
    const recipientIds = (authCheck.members || []).map((m) => String(m._id || m));

    // Persist to MongoDB with 500-message retention, 30-day TTL protection, and snapshot recipients
    const savedMessage = await saveAndTrimMessage({
      teamId,
      groupId: canonicalGroup?._id || undefined,
      senderId: req.user._id,
      text,
      recipientIds,
      replyTo: req.body.replyTo || null,
    });

    // Broadcast saved message to other team members via Socket.IO
    const io = req.app.get("io");
    if (io) {
      const idStr = String(teamId);
      const rooms = [idStr, `group:${idStr}`, `team:${idStr}`];
      if (canonicalGroup?._id) {
        const gStr = String(canonicalGroup._id);
        rooms.push(gStr, `group:${gStr}`, `team:${gStr}`);
      }
      io.to(rooms).emit("receive-message", savedMessage);
      io.to(rooms).emit("receive_message", savedMessage);
      io.to(rooms).emit("new_message", savedMessage);
      io.to(rooms).emit("new_group_message", {
        groupId: idStr,
        chatId: idStr,
        message: savedMessage,
      });
    }

    if (canonicalGroup) {
      ChatGroup.findByIdAndUpdate(canonicalGroup._id, {
        lastMessage: {
          text: text.trim().slice(0, 100),
          senderName: req.user.name,
          senderUsername: req.user.chatUsername || "",
          createdAt: savedMessage.createdAt || new Date(),
        },
      }).catch((e) => console.warn("[Chat] lastMessage update warning:", e.message));
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

// ---------------------------------------------------------------------------
// 📬 Chat Receipts Endpoints (Point 4: text-only delivery and read tracking)
// ---------------------------------------------------------------------------

// POST /api/chat/receipts/delivered - Mark messages delivered for current user
router.post("/receipts/delivered", authenticateUser, async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ success: true, updatedCount: 0 });
    }

    const validIds = messageIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const userId = req.user._id;
    const now = new Date();

    const messages = await Message.find({
      _id: { $in: validIds },
      "recipients.userId": userId,
      "recipients.delivered": false,
    });

    const updated = [];
    for (const msg of messages) {
      const r = msg.recipients.find((rec) => String(rec.userId) === String(userId));
      if (r) {
        r.delivered = true;
        r.deliveredAt = now;
        await msg.save();
        updated.push(msg);
      }
    }

    const io = req.app.get("io");
    if (io && updated.length > 0) {
      for (const msg of updated) {
        const convId = msg.conversationId || String(msg.groupId || msg.teamId);
        const senderIdStr = String(msg.senderId?._id || msg.senderId);
        const updatePayload = {
          messageId: String(msg._id),
          conversationId: convId,
          recipientId: String(userId),
          status: "delivered",
          recipients: msg.recipients,
        };
        io.to(`user:${senderIdStr}`).emit("receipt_updated", updatePayload);
        io.to([convId, `group:${convId}`, `team:${convId}`]).emit("receipt_updated", updatePayload);
      }
    }

    return res.json({ success: true, updatedCount: updated.length });
  } catch (err) {
    console.error("Delivered receipt error:", err);
    return res.status(500).json({ error: "Failed to update delivery receipts" });
  }
});

// POST /api/chat/receipts/read - Mark messages read for current user
router.post("/receipts/read", authenticateUser, async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;
    const userId = req.user._id;
    const now = new Date();

    let query = {
      "recipients.userId": userId,
      "recipients.read": false,
    };

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      const validIds = messageIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      query._id = { $in: validIds };
    } else if (conversationId) {
      const convStr = String(conversationId);
      const isOid = mongoose.Types.ObjectId.isValid(convStr);
      query.$or = [
        { conversationId: convStr },
        isOid ? { groupId: convStr } : null,
        isOid ? { teamId: convStr } : null,
      ].filter(Boolean);
    } else {
      return res.json({ success: true, updatedCount: 0 });
    }

    const messages = await Message.find(query);
    const updated = [];

    for (const msg of messages) {
      const r = msg.recipients.find((rec) => String(rec.userId) === String(userId));
      if (r) {
        r.delivered = true;
        r.deliveredAt = r.deliveredAt || now;
        r.read = true;
        r.readAt = now;
        await msg.save();
        updated.push(msg);
      }
    }

    const io = req.app.get("io");
    if (io && updated.length > 0) {
      for (const msg of updated) {
        const convId = msg.conversationId || String(msg.groupId || msg.teamId);
        const senderIdStr = String(msg.senderId?._id || msg.senderId);
        const updatePayload = {
          messageId: String(msg._id),
          conversationId: convId,
          recipientId: String(userId),
          status: "read",
          recipients: msg.recipients,
        };
        io.to(`user:${senderIdStr}`).emit("receipt_updated", updatePayload);
        io.to([convId, `group:${convId}`, `team:${convId}`]).emit("receipt_updated", updatePayload);
      }
    }

    return res.json({ success: true, updatedCount: updated.length });
  } catch (err) {
    console.error("Read receipt error:", err);
    return res.status(500).json({ error: "Failed to update read receipts" });
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

// ---------------------------------------------------------------------------
// ✏️ Edit & Delete Recent Text Messages (Add-on 8)
// ---------------------------------------------------------------------------

// PUT /api/chat/messages/:messageId - Author edits their own recent text message
router.put("/messages/:messageId", authenticateUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: "Message cannot exceed 1000 characters." });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (String(message.senderId) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only edit your own messages." });
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: "Deleted messages cannot be edited." });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const io = req.app.get("io");
    if (io) {
      const convId = message.conversationId || String(message.groupId || message.teamId);
      const rooms = [convId, `group:${convId}`, `team:${convId}`];
      io.to(rooms).emit("message_edited", {
        messageId: String(message._id),
        conversationId: convId,
        text: message.text,
        isEdited: true,
        editedAt: message.editedAt,
      });
    }

    return res.json({ success: true, message });
  } catch (err) {
    console.error("Edit message error:", err);
    return res.status(500).json({ error: "Failed to edit message." });
  }
});

// DELETE /api/chat/messages/:messageId - Author deletes their own recent message
router.delete("/messages/:messageId", authenticateUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (String(message.senderId) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only delete your own messages." });
    }

    message.text = "This message was deleted";
    message.isDeleted = true;
    await message.save();

    const io = req.app.get("io");
    if (io) {
      const convId = message.conversationId || String(message.groupId || message.teamId);
      const rooms = [convId, `group:${convId}`, `team:${convId}`];
      io.to(rooms).emit("message_deleted", {
        messageId: String(message._id),
        conversationId: convId,
      });
    }

    return res.json({ success: true, messageId: message._id });
  } catch (err) {
    console.error("Delete message error:", err);
    return res.status(500).json({ error: "Failed to delete message." });
  }
});

// ---------------------------------------------------------------------------
// 📌 Pin One Important Message (Add-on 6)
// ---------------------------------------------------------------------------

// POST /api/chat/groups/:groupId/pin - Pin an important message in the group
router.post("/groups/:groupId/pin", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { messageId, text, senderName } = req.body;

    const authCheck = await verifyGroupMembership(req.user._id, groupId, req.user.role);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error });
    }

    const pinnedMessage = {
      messageId: messageId || undefined,
      text: String(text || "").slice(0, 500),
      senderName: senderName || req.user.name,
      pinnedBy: req.user.name,
      pinnedAt: new Date(),
    };

    const group = await ChatGroup.findByIdAndUpdate(
      groupId,
      { pinnedMessage },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      const gStr = String(groupId);
      io.to([gStr, `group:${gStr}`]).emit("pinned_message_updated", {
        groupId: gStr,
        pinnedMessage,
      });
    }

    return res.json({ success: true, pinnedMessage });
  } catch (err) {
    console.error("Pin message error:", err);
    return res.status(500).json({ error: "Failed to pin message." });
  }
});

// DELETE /api/chat/groups/:groupId/pin - Unpin message
router.delete("/groups/:groupId/pin", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const authCheck = await verifyGroupMembership(req.user._id, groupId, req.user.role);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error });
    }

    await ChatGroup.findByIdAndUpdate(groupId, { $unset: { pinnedMessage: 1 } });

    const io = req.app.get("io");
    if (io) {
      const gStr = String(groupId);
      io.to([gStr, `group:${gStr}`]).emit("pinned_message_updated", {
        groupId: gStr,
        pinnedMessage: null,
      });
    }

    return res.json({ success: true, pinnedMessage: null });
  } catch (err) {
    console.error("Unpin message error:", err);
    return res.status(500).json({ error: "Failed to unpin message." });
  }
});

// ---------------------------------------------------------------------------
// 🔕 Mute / Unmute Group (Add-on 8)
// ---------------------------------------------------------------------------

// POST /api/chat/groups/:groupId/mute - Toggle mute notifications for group
router.post("/groups/:groupId/mute", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const currentMuted = user.mutedConversations || [];
    const isMuted = currentMuted.includes(String(groupId));

    if (isMuted) {
      user.mutedConversations = currentMuted.filter((id) => id !== String(groupId));
    } else {
      user.mutedConversations.push(String(groupId));
    }

    await user.save();
    return res.json({ success: true, isMuted: !isMuted, mutedConversations: user.mutedConversations });
  } catch (err) {
    console.error("Toggle mute error:", err);
    return res.status(500).json({ error: "Failed to toggle mute." });
  }
});

export default router;
