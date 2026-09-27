import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    hackathonTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HackathonTeam",
    },
    type: {
      type: String,
      enum: ["project", "hackathon"],
      default: "project",
    },
    teamName: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "Teammate",
    },
    message: {
      type: String,
      default: "You've been invited to join the squad!",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Invitation = mongoose.model("Invitation", invitationSchema);

export default Invitation;
