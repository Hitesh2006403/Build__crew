import mongoose from "mongoose";

const hackathonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    circuitId: {
      type: String,
      default: "",
    },
    simpleId: {
      type: String,
      default: "",
    },
    subtitle: {
      type: String,
      default: "",
    },
    organizer: {
      name: { type: String, default: "" },
      website: { type: String, default: "" },
      partnerType: { type: String, default: "Circuit Host" },
    },
    description: {
      type: String,
      default: "",
    },
    officialWebsite: {
      type: String,
      default: "",
    },
    officialRegistrationLink: {
      type: String,
      default: "",
    },
    registrationLink: {
      type: String,
      default: "",
    },
    dates: {
      type: String,
      default: "",
    },
    startDate: {
      type: String,
      default: "",
    },
    startDateRaw: {
      type: String,
      default: "",
    },
    startTime: {
      type: String,
      default: "",
    },
    startTimeRaw: {
      type: String,
      default: "",
    },
    endDate: {
      type: String,
      default: "",
    },
    endDateRaw: {
      type: String,
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    endTimeRaw: {
      type: String,
      default: "",
    },
    registrationDeadline: {
      type: String,
      default: "",
    },
    regDeadlineDate: {
      type: String,
      default: "",
    },
    regDeadlineTime: {
      type: String,
      default: "",
    },
    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid", "online", "offline", "hybrid", "in-person", "virtual"],
      default: "Hybrid",
    },
    location: {
      type: String,
      default: "Collegiate Venue / Virtual",
    },
    state: {
      type: String,
      default: "Karnataka",
    },
    district: {
      type: String,
      default: "Bengaluru Urban",
    },
    registrationFee: {
      type: String,
      default: "₹0 / Free",
    },
    feeType: {
      type: String,
      default: "free",
    },
    feeAmount: {
      type: Number,
      default: 0,
    },
    minTeamSize: {
      type: Number,
      default: 2,
    },
    maxTeamSize: {
      type: Number,
      default: 4,
    },
    teamSize: {
      type: String,
      default: "2 to 4 Builders",
    },
    squadLimits: {
      type: String,
      default: "2 to 4 Builders",
    },
    eligibility: {
      type: String,
      default: "Enrolled Undergraduate / Graduate Students",
    },
    tracks: {
      type: [String],
      default: ["ai", "general"],
    },
    trackLabels: {
      type: [String],
      default: ["AI / ML", "General"],
    },
    prizePool: {
      type: String,
      default: "₹50,000",
    },
    rules: {
      type: [String],
      default: [
        "All code must be written during the active sprint hours.",
        "Teams must adhere to collegiate code of conduct guidelines.",
        "Pre-existing libraries/APIs are permitted with proper attribution."
      ],
    },
    bounties: [
      {
        track: String,
        prize: String,
        sponsor: String,
      },
    ],
    schedule: [
      {
        phase: String,
        date: String,
        status: String,
      },
    ],
    lastVerified: {
      verifiedAt: { type: String, default: "" },
      verifier: { type: String, default: "BuildCrew Verification Board" },
    },
    officialSource: {
      type: String,
      default: "BuildCrew Collegiate Sanctioning Board",
    },
    image: {
      type: String,
      default: "https://lh3.googleusercontent.com/aida-public/AB6AXuBjbkVkD8ugQCopgjlKUdX6h2t7iGR8U7cAotGEX4gkVp2iZGYgNXuhDd7uv8XKPdDKxRc5LVG5-2ku_w-inG49pGRXEBeatfaGIbtDqTB4GZbf-12sVHdMJBR4s9dSwOvIgdwjHPZxHAYY6iul7GnOXO1wqM8s9NQjaFCIpekgajipka8rL8aNXyl4sNuZ5jWKKChl91y1bgaayoCYgzuMAvhhpxODIRFzAx9FdSUbydfyLDzrLu9E",
    },
    heroImage: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "open",
    },
    statusLabel: {
      type: String,
      default: "Registration open",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    registeredTeams: {
      type: Number,
      default: 0,
    },
    maxCap: {
      type: Number,
      default: 500,
    },
    seekersCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Hackathon = mongoose.model("Hackathon", hackathonSchema);

export default Hackathon;
