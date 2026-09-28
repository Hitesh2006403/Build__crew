import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectTitle: {
      type: String,
      default: "",
    },
    applicantName: {
      type: String,
      default: "",
    },
    applicantEmail: {
      type: String,
      default: "",
    },
    applicantAvatar: {
      type: String,
      default: "",
    },
    requestedRole: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
    statusColor: {
      type: String,
      default: "bg-secondary-fixed text-on-secondary-fixed",
    },
    submittedAt: {
      type: String,
      default: "Just now",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate application from same applicant to same project for the same role
applicationSchema.index({ project: 1, applicant: 1, requestedRole: 1 }, { unique: true });

const Application = mongoose.model("Application", applicationSchema);

export default Application;
