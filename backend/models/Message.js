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

/**
 * Storage Protection Helper:
 * Saves a new message and enforces the maximum 500 messages per conversation limit.
 * If more than 500 messages exist for this conversation, removes the oldest messages and retains the newest 500.
 */
export async function saveAndTrimMessage({ teamId, groupId, senderId, text }) {
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

  // 1. Persist the new message to MongoDB
  const message = await Message.create({
    teamId: teamId || undefined,
    groupId: groupId || undefined,
    conversationId: convId,
    senderId,
    text: trimmedText,
    read: false,
  });

  // 2. Check and enforce 500-message ceiling per conversation
  try {
    const filter = groupId ? { groupId } : { teamId };
    const totalCount = await Message.countDocuments(filter);
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
  } catch (cleanErr) {
    console.warn("[Storage Protection] Chat message cleanup warning:", cleanErr.message);
  }

  // 3. Populate sender information from User model for frontend rendering
  await message.populate("senderId", "name email avatar profileImage chatUsername role roleTitle college university");

  return message;
}

const Message = mongoose.model("Message", messageSchema);

export default Message;
