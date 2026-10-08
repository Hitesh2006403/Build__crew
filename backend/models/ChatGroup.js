import mongoose from "mongoose";

const chatGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [60, "Group name cannot exceed 60 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [200, "Group description cannot exceed 200 characters"],
    },
    // The only image allowed in the chat feature is the group profile picture
    groupProfilePic: {
      type: String,
      default: "",
    },
    // Underlying team/project reference
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: false,
    },
    teamName: {
      type: String,
      default: "Team Squad",
    },
    teamType: {
      type: String,
      enum: ["Project", "HackathonTeam", "Team", "Custom"],
      default: "Project",
    },
    // The team admin who created the group
    // NOTE: indexed once via chatGroupSchema.index({ admin: 1 }) below.
    // Do not add `index: true` here or Mongoose logs a duplicate-index warning.
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Team members added to the group
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      text: { type: String, default: "" },
      senderName: { type: String, default: "" },
      senderUsername: { type: String, default: "" },
      createdAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
chatGroupSchema.index({ members: 1 });
chatGroupSchema.index({ admin: 1 });
chatGroupSchema.index({ updatedAt: -1 });

const ChatGroup = mongoose.model("ChatGroup", chatGroupSchema);

export default ChatGroup;
