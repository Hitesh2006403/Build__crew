import express from "express";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import { authenticateUser, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/projects - Search and retrieve projects from MongoDB
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const { search, category, campus, role } = req.query;
    const query = {};

    if (category && category !== "all") {
      query.type = category;
    }

    if (campus && campus !== "all") {
      query.campus = campus;
    }

    if (role && role !== "all") {
      query.rolesNeeded = { $regex: new RegExp(role, "i") };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: "i" } },
        { fullTitle: { $regex: s, $options: "i" } },
        { tagline: { $regex: s, $options: "i" } },
        { fullDescription: { $regex: s, $options: "i" } },
        { techStack: { $regex: s, $options: "i" } },
        { rolesNeeded: { $regex: s, $options: "i" } },
        { "lead.name": { $regex: s, $options: "i" } },
      ];
    }

    const projects = await Project.find(query)
      .populate("createdBy", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("members", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .sort({ createdAt: -1 });

    return res.json(projects);
  } catch (err) {
    console.error("Fetch projects error:", err);
    return res.status(500).json({ error: "Could not retrieve projects from database.", details: err.message });
  }
});

// GET /api/projects/:id - Single project
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let project = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      project = await Project.findById(id)
        .populate("createdBy", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
        .populate("members", "name email avatar college university role roleTitle github linkedin showEmailToTeam");
    }

    if (!project) {
      // Fallback search by custom slug or title if applicable
      project = await Project.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { fullTitle: id }] })
        .populate("createdBy", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
        .populate("members", "name email avatar college university role roleTitle github linkedin showEmailToTeam");
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found in database." });
    }

    return res.json(project);
  } catch (err) {
    return res.status(500).json({ error: "Error retrieving project.", details: err.message });
  }
});

// POST /api/projects - Create a new project
router.post("/", authenticateUser, async (req, res) => {
  try {
    const {
      title,
      fullTitle,
      tagline,
      type,
      categoryBadge,
      category,
      problemBeingSolved,
      whatAreYouBuilding,
      expectedCompletionDate,
      roles,
      techStack,
      rolesNeeded,
      campus,
      totalCapacity,
      openVacancies,
      image,
      githubRepository,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Project title is required." });
    }

    const parsedTechStack = Array.isArray(techStack)
      ? techStack
      : typeof techStack === "string"
      ? techStack.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const parsedRolesNeeded = Array.isArray(rolesNeeded)
      ? rolesNeeded
      : typeof rolesNeeded === "string"
      ? rolesNeeded.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const vacancies = Array.isArray(openVacancies) && openVacancies.length > 0
      ? openVacancies
      : parsedRolesNeeded.map((r, i) => ({
          id: `dev-${Date.now()}-${i}`,
          track: "Core Contributor",
          title: r,
          seats: "1 seat available",
          desc: whatAreYouBuilding || tagline || "",
          skills: parsedTechStack.slice(0, 3),
          hours: "",
        }));

    const finalTagline = tagline ? tagline.trim() : (whatAreYouBuilding ? whatAreYouBuilding.trim() : "");
    const finalDescription = (problemBeingSolved && whatAreYouBuilding)
      ? `${problemBeingSolved.trim()}\n\n${whatAreYouBuilding.trim()}`
      : (problemBeingSolved || whatAreYouBuilding || tagline || "");

    const newProject = await Project.create({
      title: title.trim(),
      fullTitle: fullTitle ? fullTitle.trim() : title.trim(),
      tagline: finalTagline,
      fullDescription: finalDescription,
      problemBeingSolved: problemBeingSolved ? problemBeingSolved.trim() : "",
      whatAreYouBuilding: whatAreYouBuilding ? whatAreYouBuilding.trim() : "",
      expectedCompletionDate: expectedCompletionDate ? expectedCompletionDate.trim() : "",
      category: category ? category.trim() : (categoryBadge ? categoryBadge.trim() : ""),
      categoryBadge: category ? category.trim() : (categoryBadge ? categoryBadge.trim() : ""),
      type: type || "hackathon",
      recruitingBadge: vacancies.length > 0 ? `Recruiting ${vacancies.length} Roles` : "Recruiting Roles",
      techStack: parsedTechStack,
      rolesNeeded: parsedRolesNeeded,
      roles: Array.isArray(roles) ? roles : [],
      campus: campus ? campus.trim() : (req.user.college || req.user.university || ""),
      filledCount: 1,
      totalCapacity: Number(totalCapacity) || 4,
      openVacancies: vacancies,
      image: image ? image.trim() : "",
      githubRepository: githubRepository ? githubRepository.trim() : "",
      createdBy: req.user._id,
      lead: {
        name: req.user.name,
        university: req.user.university || req.user.college || "",
        program: req.user.branch || req.user.major || "",
        roleTitle: req.user.roleTitle || "Squad Creator",
        avatar: req.user.avatar || req.user.profileImage || "",
        leadAvatarFull: req.user.avatar || req.user.profileImage || "",
      },
      members: [req.user._id],
      status: "recruiting",
    });

    const populated = await Project.findById(newProject._id)
      .populate("createdBy", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("members", "name email avatar college university role roleTitle github linkedin showEmailToTeam");

    return res.status(201).json({
      success: true,
      message: "Project created successfully in MongoDB.",
      project: populated,
    });
  } catch (err) {
    console.error("Create project error:", err);
    return res.status(500).json({ error: "Failed to create project.", details: err.message });
  }
});

// PUT /api/projects/:id - Update project (Owner or Admin only)
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid project ID format." });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only the project owner or an admin can edit this project." });
    }

    const allowed = [
      "title",
      "fullTitle",
      "tagline",
      "fullDescription",
      "type",
      "categoryBadge",
      "techStack",
      "rolesNeeded",
      "campus",
      "totalCapacity",
      "openVacancies",
      "image",
      "status",
      "githubRepository",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await Project.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate("createdBy", "name email avatar university role")
      .populate("members", "name email avatar university role");

    return res.json({
      success: true,
      message: "Project updated successfully.",
      project: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update project.", details: err.message });
  }
});

// DELETE /api/projects/:id - Delete project (Owner or Admin only)
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid project ID format." });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only the project owner or an admin can delete this project." });
    }

    await Project.findByIdAndDelete(id);
    return res.json({ success: true, message: "Project deleted from database." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete project.", details: err.message });
  }
});

export default router;
