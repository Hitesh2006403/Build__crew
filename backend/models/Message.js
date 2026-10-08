import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [1000, "Maximum message length is 1000 characters"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Reply feature (Add-on 5)
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      senderName: {
        type: String,
        default: "",
      },
      text: {
        type: String,
        default: "",
        maxlength: 300,
      },
    },
    // Edit & Delete feature (Add-on 8)
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Per-recipient delivery & read receipts tracking (Point 4)
    recipients: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        delivered: {
          type: Boolean,
          default: false,
        },
        deliveredAt: {
          type: Date,
        },
        read: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// MongoDB Atlas Free Storage Protection:
// 1. 30-day TTL expiration using createdAt (30 days = 2,592,000 seconds)
// This TTL affects ONLY chat messages and automatically removes messages older than 30 days.
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// 2. Fast retrieval indexes for conversation history
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ groupId: 1, createdAt: 1 });
messageSchema.index({ teamId: 1, createdAt: 1 });
messageSchema.index({ "recipients.userId": 1 });

/**
 * Storage Protection Helper:
 * Saves a new message and enforces the maximum 500 messages per conversation limit.
 * Populates snapshot recipients at send time (Point 4).
 */
export async function saveAndTrimMessage({ teamId, groupId, senderId, text, recipientIds = [], replyTo = null }) {
  if (!text || typeof text !== "string") {
    throw new Error("Message text is required.");
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    throw new Error("Message text cannot be empty.");
  }
  if (trimmedText.length > 1000) {
    throw new Error("Maximum message length is 1000 characters.");
  }

  const convId = groupId ? String(groupId) : String(teamId);

  // Derive initial recipients snapshot: all team members EXCEPT the sender
  let recipientsList = [];
  const senderIdStr = String(senderId);

  if (Array.isArray(recipientIds) && recipientIds.length > 0) {
    const uniqueIds = Array.from(new Set(recipientIds.map(String))).filter((id) => id !== senderIdStr);
    recipientsList = uniqueIds.map((uId) => ({
      userId: uId,
      delivered: false,
      read: false,
    }));
  } else {
    try {
      if (groupId) {
        const ChatGroup = mongoose.model("ChatGroup");
        const grp = await ChatGroup.findById(groupId).select("members admin").lean();
        if (grp) {
          const allMemberIds = new Set([
            ...(grp.members || []).map(String),
            grp.admin ? String(grp.admin) : null,
          ].filter(Boolean));
          allMemberIds.delete(senderIdStr);
          recipientsList = Array.from(allMemberIds).map((uId) => ({
            userId: uId,
            delivered: false,
            read: false,
          }));
        }
      } else if (teamId) {
        const Project = mongoose.model("Project");
        const proj = await Project.findById(teamId).select("members createdBy").lean();
        if (proj) {
          const allMemberIds = new Set([
            ...(proj.members || []).map(String),
            proj.createdBy ? String(proj.createdBy) : null,
          ].filter(Boolean));
          allMemberIds.delete(senderIdStr);
          recipientsList = Array.from(allMemberIds).map((uId) => ({
            userId: uId,
            delivered: false,
            read: false,
          }));
        } else {
          const HackathonTeam = mongoose.model("HackathonTeam");
          const hTeam = await HackathonTeam.findById(teamId).select("members createdBy").lean();
          if (hTeam) {
            const allMemberIds = new Set([
              ...(hTeam.members || []).map(String),
              hTeam.createdBy ? String(hTeam.createdBy) : null,
            ].filter(Boolean));
            allMemberIds.delete(senderIdStr);
            recipientsList = Array.from(allMemberIds).map((uId) => ({
              userId: uId,
              delivered: false,
              read: false,
            }));
          }
        }
      }
    } catch (e) {
      console.warn("[Message] Recipient snapshot lookup warning:", e.message);
    }
  }

  // 1. Persist the new message to MongoDB
  const message = await Message.create({
    teamId: teamId || undefined,
    groupId: groupId || undefined,
    conversationId: convId,
    senderId,
    text: trimmedText,
    read: false,
    recipients: recipientsList,
    replyTo: replyTo && replyTo.text ? {
      messageId: replyTo.messageId || undefined,
      senderName: replyTo.senderName || "",
      text: String(replyTo.text).slice(0, 300),
    } : undefined,
  });

  // 2. Enforce 500-message ceiling per conversation without blocking the response.
  const filter = groupId ? { groupId } : { teamId };
  Message.countDocuments(filter)
    .then(async (totalCount) => {
      if (totalCount > 500) {
        const excess = totalCount - 500;
        const oldestMessages = await Message.find(filter)
          .sort({ createdAt: 1 })
          .limit(excess)
          .select("_id")
          .lean();
        if (oldestMessages.length > 0) {
          const idsToDelete = oldestMessages.map((m) => m._id);
          await Message.deleteMany({ _id: { $in: idsToDelete } });
        }
      }
    })
    .catch((cleanErr) => {
      console.warn("[Storage Protection] Chat message cleanup warning:", cleanErr.message);
    });

  // 3. Populate sender information from User model for frontend rendering
  await message.populate("senderId", "name email avatar profileImage chatUsername role roleTitle college university");

  return message;
}

const Message = mongoose.model("Message", messageSchema);

export default Message;
