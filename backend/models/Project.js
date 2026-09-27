import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fullTitle: {
      type: String,
      default: "",
    },
    tagline: {
      type: String,
      default: "",
    },
    fullDescription: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["hackathon", "startup", "research", "capstone"],
      default: "hackathon",
    },
    categoryBadge: {
      type: String,
      default: "Collegiate Sprint",
    },
    recruitingBadge: {
      type: String,
      default: "Recruiting Roles",
    },
    trackName: {
      type: String,
      default: "",
    },
    sprintNotice: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    problemBeingSolved: {
      type: String,
      default: "",
    },
    whatAreYouBuilding: {
      type: String,
      default: "",
    },
    expectedCompletionDate: {
      type: String,
      default: "",
    },
    roles: [
      {
        roleName: String,
        membersCount: { type: Number, default: 1 },
      },
    ],
    urgency: {
      type: String,
      default: "medium",
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    publishedTime: {
      type: String,
      default: "Just now",
    },
    image: {
      type: String,
      default: "",
    },
    imageTag: {
      type: String,
      default: "",
    },
    techStack: {
      type: [String],
      default: [],
    },
    rolesNeeded: {
      type: [String],
      default: [],
    },
    campus: {
      type: String,
      default: "",
    },
    filledCount: {
      type: Number,
      default: 1,
    },
    totalCapacity: {
      type: Number,
      default: 4,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lead: {
      name: { type: String, default: "" },
      university: { type: String, default: "" },
      program: { type: String, default: "" },
      roleTitle: { type: String, default: "Squad Creator" },
      avatar: { type: String, default: "" },
      leadAvatarFull: { type: String, default: "" },
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    metaStats: {
      commits: { type: String, default: "" },
      branches: { type: String, default: "" },
      submissionTarget: { type: String, default: "" },
    },
    problemSolving: {
      description: { type: String, default: "" },
      cards: [
        {
          icon: String,
          color: String,
          title: String,
          desc: String,
        },
      ],
    },
    architecture: {
      summary: { type: String, default: "" },
      badge: { type: String, default: "" },
      stages: [
        {
          stage: String,
          icon: String,
          title: String,
          desc: String,
          tech: String,
        },
      ],
    },
    openVacancies: [
      {
        id: String,
        track: String,
        title: String,
        seats: String,
        desc: String,
        skills: [String],
        hours: String,
      },
    ],
    githubRepository: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["recruiting", "active", "completed", "archived"],
      default: "recruiting",
    },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
