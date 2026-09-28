import express from "express";
import mongoose from "mongoose";
import Hackathon from "../models/Hackathon.js";
import HackathonTeam from "../models/HackathonTeam.js";
import { authenticateUser, requireAdmin, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/hackathons - Fetch circuit hackathons
// Students see only published events; Admins see all hackathons including drafts
router.get("/", optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const isAdmin = req.user && req.user.role === "admin";
    const query = isAdmin ? {} : { isPublished: true };

    const hackathons = await Hackathon.find(query).sort({ createdAt: -1 });
    return res.json(hackathons);
  } catch (err) {
    console.error("Fetch hackathons error:", err);
    return res.status(500).json({ error: "Could not retrieve hackathons.", details: err.message });
  }
});

// GET /api/hackathons/:id - Fetch single hackathon
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let hack = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      hack = await Hackathon.findById(id);
    }
    if (!hack) {
      hack = await Hackathon.findOne({ circuitId: id });
    }

    if (!hack) {
      return res.status(404).json({ error: "Hackathon not found in database." });
    }

    // Only admins can see unpublished hackathons
    if (!hack.isPublished && (!req.user || req.user.role !== "admin")) {
      return res.status(403).json({ error: "This hackathon has not been published yet." });
    }

    return res.json(hack);
  } catch (err) {
    return res.status(500).json({ error: "Error retrieving hackathon.", details: err.message });
  }
});

// POST /api/hackathons - Create a new hackathon (Admin or Student Community Submission)
router.post("/", authenticateUser, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const data = req.body;

    if (!data.title || !data.title.trim()) {
      return res.status(400).json({ error: "Hackathon title is required." });
    }

    const defaultImage =
      data.image ||
      data.heroImage ||
      data.coverImage ||
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBjbkVkD8ugQCopgjlKUdX6h2t7iGR8U7cAotGEX4gkVp2iZGYgNXuhDd7uv8XKPdDKxRc5LVG5-2ku_w-inG49pGRXEBeatfaGIbtDqTB4GZbf-12sVHdMJBR4s9dSwOvIgdwjHPZxHAYY6iul7GnOXO1wqM8s9NQjaFCIpekgajipka8rL8aNXyl4sNuZ5jWKKChl91y1bgaayoCYgzuMAvhhpxODIRFzAx9FdSUbydfyLDzrLu9E";

    const isPub = isAdmin ? (data.isPublished !== undefined ? Boolean(data.isPublished) : true) : false;

    const newHackathon = await Hackathon.create({
      title: data.title.trim(),
      circuitId: data.circuitId || `BC-CIRC-${Math.floor(1000 + Math.random() * 9000)}`,
      subtitle: data.subtitle || (data.organizer ? `Organized by ${typeof data.organizer === "object" ? data.organizer.name : data.organizer}` : "Collegiate Circuit Partner"),
      organizer: {
        name: typeof data.organizer === "object" ? data.organizer.name : data.organizer || "Student Community Committee",
        website: typeof data.organizer === "object" ? data.organizer.website : data.officialWebsite || "#",
        partnerType: isAdmin ? "Sanctioned Circuit Partner" : "Community Submitter",
      },
      description: data.description ? data.description.trim() : "Collegiate Circuit Hackathon.",
      officialWebsite: data.officialWebsite || "",
      officialRegistrationLink: data.officialRegistrationLink || data.registrationLink || "",
      registrationLink: data.registrationLink || data.officialRegistrationLink || "",
      dates: data.dates || "Upcoming 2026",
      startDate: data.startDate || "",
      startDateRaw: data.startDateRaw || "",
      startTime: data.startTime || "",
      startTimeRaw: data.startTimeRaw || "",
      endDate: data.endDate || "",
      endDateRaw: data.endDateRaw || "",
      endTime: data.endTime || "",
      endTimeRaw: data.endTimeRaw || "",
      registrationDeadline: data.registrationDeadline || "Rolling Admissions",
      regDeadlineDate: data.regDeadlineDate || "",
      regDeadlineTime: data.regDeadlineTime || "",
      mode: data.mode || "Hybrid",
      location: data.location || "Collegiate Venue / Virtual",
      registrationFee: data.registrationFee || (data.feeType === "paid" ? `₹${data.feeAmount || 0}` : "₹0 / Free"),
      feeType: data.feeType || "free",
      feeAmount: Number(data.feeAmount) || 0,
      minTeamSize: Number(data.minTeamSize) || 2,
      maxTeamSize: Number(data.maxTeamSize) || 4,
      teamSize: data.teamSize || `${data.minTeamSize || 2} to ${data.maxTeamSize || 4} Builders`,
      squadLimits: data.squadLimits || `${data.minTeamSize || 2} to ${data.maxTeamSize || 4} Builders`,
      eligibility: data.eligibility || "Enrolled collegiate students worldwide",
      tracks: Array.isArray(data.tracks) ? data.tracks : ["ai", "general"],
      trackLabels: Array.isArray(data.trackLabels) ? data.trackLabels : ["AI / ML", "General"],
      prizePool: data.prizePool || "₹50,000",
      rules: Array.isArray(data.rules) && data.rules.length > 0 ? data.rules : [
        "All project code must be developed solely within the active sprint window.",
        "Cross-institutional squads are strictly permitted.",
      ],
      officialSource: data.officialSource || "BuildCrew Collegiate Sanctioning Board",
      image: defaultImage,
      heroImage: defaultImage,
      coverImage: defaultImage,
      logo: defaultImage,
      status: isPub ? (data.status || "open") : "draft",
      statusLabel: isPub ? (data.statusLabel || "Registration open") : "Draft (Pending Review)",
      isPublished: isPub,
      isFeatured: Boolean(data.isFeatured),
      isVerified: isAdmin ? true : false,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: isAdmin ? "Hackathon published to circuit registry in MongoDB." : "Hackathon submitted for admin sanction review.",
      hackathon: newHackathon,
    });
  } catch (err) {
    console.error("Create hackathon error:", err);
    return res.status(500).json({ error: "Failed to create hackathon.", details: err.message });
  }
});

// PUT /api/hackathons/:id - Update hackathon (Admin only)
router.put("/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid hackathon ID format." });
    }

    const updated = await Hackathon.findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ error: "Hackathon not found." });
    }

    return res.json({
      success: true,
      message: "Hackathon updated in MongoDB.",
      hackathon: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update hackathon.", details: err.message });
  }
});

// PATCH /api/hackathons/:id/publish - Quick toggle publish status (Admin only)
router.patch("/:id/publish", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid hackathon ID format." });
    }

    const hack = await Hackathon.findById(id);
    if (!hack) {
      return res.status(404).json({ error: "Hackathon not found." });
    }

    const newPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : !hack.isPublished;
    hack.isPublished = newPublished;
    hack.status = newPublished ? (hack.status === "draft" ? "open" : hack.status) : "draft";
    hack.statusLabel = newPublished ? (hack.status === "draft" ? "Registration open" : hack.statusLabel) : "Draft";
    await hack.save();

    return res.json({
      success: true,
      message: `Hackathon ${newPublished ? "published live" : "saved as draft"}.`,
      hackathon: hack,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to toggle hackathon status.", details: err.message });
  }
});

// DELETE /api/hackathons/:id - Delete hackathon (Admin only)
router.delete("/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid hackathon ID format." });
    }

    const deleted = await Hackathon.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Hackathon not found." });
    }

    return res.json({
      success: true,
      message: `Hackathon "${deleted.title}" deleted from circuit database.`,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete hackathon.", details: err.message });
  }
});

// ---------------- HACKATHON TEAMS / SQUADS ----------------

// GET /api/hackathons/:id/teams - Get teams for a hackathon
router.get("/:id/teams", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ hackathon: id }, { hackathonId: id }] }
      : { hackathonId: id };

    const teams = await HackathonTeam.find(query)
      .populate("createdBy", "name email avatar profileImage university role")
      .populate("members", "name email avatar profileImage university role skills")
      .sort({ createdAt: -1 });

    return res.json(teams);
  } catch (err) {
    return res.status(500).json({ error: "Could not retrieve hackathon squads.", details: err.message });
  }
});

// POST /api/hackathons/:id/teams - Create a hackathon team
router.post("/:id/teams", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    let hackathon = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      hackathon = await Hackathon.findById(id);
    }
    if (!hackathon) {
      hackathon = await Hackathon.findOne({ circuitId: id });
    }

    if (!hackathon) {
      return res.status(404).json({ error: "Target hackathon not found." });
    }

    const { teamName, track, projectIdea, rolesNeeded, openVacancies } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: "Team name is required." });
    }

    const newSquad = await HackathonTeam.create({
      hackathon: hackathon._id,
      hackathonId: hackathon._id.toString(),
      hackathonTitle: hackathon.title,
      teamName: teamName.trim(),
      title: teamName.trim(),
      track: track || "General Track",
      tagline: projectIdea || `${teamName.trim()} sprint squad for ${hackathon.title}`,
      description: projectIdea || "",
      filledCount: 1,
      totalCapacity: hackathon.maxTeamSize || 4,
      createdBy: req.user._id,
      lead: {
        name: req.user.name,
        university: req.user.university || req.user.college,
        role: "Team Lead",
        avatar: req.user.avatar || req.user.profileImage,
      },
      members: [req.user._id],
      openVacancies: Array.isArray(openVacancies) && openVacancies.length > 0
        ? openVacancies
        : [
            {
              title: rolesNeeded || "Fullstack Contributor",
              seats: "1 seat open",
              skills: ["React", "FastAPI"],
              hours: "8 hrs/week",
            },
          ],
      status: "recruiting",
    });

    // Increment registered teams on hackathon
    hackathon.registeredTeams = (hackathon.registeredTeams || 0) + 1;
    await hackathon.save();

    const populated = await HackathonTeam.findById(newSquad._id)
      .populate("createdBy", "name email avatar profileImage university role")
      .populate("members", "name email avatar profileImage university role");

    return res.status(201).json({
      success: true,
      message: "Hackathon squad created in MongoDB.",
      team: populated,
    });
  } catch (err) {
    console.error("Create hackathon team error:", err);
    return res.status(500).json({ error: "Failed to create hackathon team.", details: err.message });
  }
});

export default router;
