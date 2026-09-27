import express from "express";
import mongoose from "mongoose";
import Invitation from "../models/Invitation.js";
import Project from "../models/Project.js";
import HackathonTeam from "../models/HackathonTeam.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authenticateUser } from "../middleware/auth.js";
import { sendTeamInvitationEmail } from "../utils/emailService.js";

const router = express.Router();

// GET /api/invitations/my - Invitations received by or sent by authenticated user
router.get("/my", authenticateUser, async (req, res) => {
  try {
    const received = await Invitation.find({ receiver: req.user._id })
      .populate("sender", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("project", "title categoryBadge type members totalCapacity filledCount")
      .populate("team", "teamName")
      .populate("hackathonTeam", "teamName title hackathonTitle members totalCapacity filledCount")
      .sort({ createdAt: -1 });

    const sent = await Invitation.find({ sender: req.user._id })
      .populate("receiver", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("project", "title categoryBadge type members totalCapacity filledCount")
      .populate("team", "teamName")
      .populate("hackathonTeam", "teamName title hackathonTitle members totalCapacity filledCount")
      .sort({ createdAt: -1 });

    return res.json({ received, sent });
  } catch (err) {
    console.error("Fetch invitations error:", err);
    return res.status(500).json({ error: "Could not retrieve invitations.", details: err.message });
  }
});

// POST /api/invitations - Dispatch invitation to a student
router.post("/", authenticateUser, async (req, res) => {
  try {
    const targetReceiverId = req.body.receiverId || req.body.receiver;
    const { hackathonTeamId, type, role, message } = req.body;
    const inputProjectId = req.body.projectId || req.body.project;
    const inputTeamId = req.body.teamId || req.body.team;

    // Rule 1: Valid receiverId
    if (!targetReceiverId || !mongoose.Types.ObjectId.isValid(targetReceiverId)) {
      return res.status(400).json({ error: "Valid receiverId is required." });
    }

    // Rule 2: Cannot invite yourself
    if (targetReceiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot invite yourself to a team." });
    }

    const receiver = await User.findById(targetReceiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Recipient student account not found." });
    }

    let targetType = type || (hackathonTeamId ? "hackathon" : "project");
    let targetProjectId = inputProjectId && mongoose.Types.ObjectId.isValid(inputProjectId) ? inputProjectId : null;
    let targetHackathonTeamId = hackathonTeamId && mongoose.Types.ObjectId.isValid(hackathonTeamId) ? hackathonTeamId : null;
    let targetTeamName = "Squad";

    // If neither was explicitly passed, check if sender has an active project or hackathon team
    if (!targetProjectId && !targetHackathonTeamId) {
      const senderProject = await Project.findOne({
        $or: [{ createdBy: req.user._id }, { members: req.user._id }],
      }).sort({ updatedAt: -1 });

      if (senderProject) {
        targetProjectId = senderProject._id;
        targetType = "project";
      } else {
        const senderHackTeam = await HackathonTeam.findOne({
          $or: [{ createdBy: req.user._id }, { members: req.user._id }],
        }).sort({ updatedAt: -1 });
        if (senderHackTeam) {
          targetHackathonTeamId = senderHackTeam._id;
          targetType = "hackathon";
        }
      }
    }

    if (!targetProjectId && !targetHackathonTeamId) {
      return res.status(400).json({
        error: "You must create or lead a project or hackathon team before you can invite teammates.",
      });
    }

    // Validate Project Team Rules
    if (targetProjectId) {
      const project = await Project.findById(targetProjectId);
      if (!project) {
        return res.status(404).json({ error: "Target project team not found." });
      }
      targetTeamName = project.title;

      // Rule: Authorization check (Only owner or member can invite)
      const isOwner = project.createdBy.toString() === req.user._id.toString();
      const isMember = project.members.some((m) => m.toString() === req.user._id.toString());
      if (!isOwner && !isMember && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Only team owner or members can send invitations." });
      }

      // Rule: Do not allow inviting a user who is already a team member
      const receiverIsMember = project.members.some((m) => m.toString() === receiver._id.toString());
      const receiverIsOwner = project.createdBy.toString() === receiver._id.toString();
      if (receiverIsMember || receiverIsOwner) {
        return res.status(400).json({ error: `${receiver.name} is already a member of this team.` });
      }

      // Rule: Do not allow invitations when the team is already full
      const currentCount = project.filledCount || project.members.length || 1;
      const capacity = project.totalCapacity || 4;
      if (currentCount >= capacity) {
        return res.status(400).json({ error: `Team "${project.title}" has reached its maximum capacity (${capacity} members).` });
      }

      // Rule: Do not allow duplicate pending invitations for the same user and team
      const existing = await Invitation.findOne({
        receiver: receiver._id,
        project: targetProjectId,
        status: "pending",
      });
      if (existing) {
        return res.status(409).json({ error: `A pending invitation to "${project.title}" has already been sent to ${receiver.name}.` });
      }
    }

    // Validate Hackathon Team Rules
    if (targetHackathonTeamId) {
      const hTeam = await HackathonTeam.findById(targetHackathonTeamId);
      if (!hTeam) {
        return res.status(404).json({ error: "Target hackathon team not found." });
      }
      targetTeamName = hTeam.teamName || hTeam.title || "Hackathon Squad";

      // Rule: Authorization check
      const isOwner = hTeam.createdBy.toString() === req.user._id.toString();
      const isMember = hTeam.members.some((m) => m.toString() === req.user._id.toString());
      if (!isOwner && !isMember && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Only team owner or members can send invitations." });
      }

      // Rule: Already a member check
      const receiverIsMember = hTeam.members.some((m) => m.toString() === receiver._id.toString());
      const receiverIsOwner = hTeam.createdBy.toString() === receiver._id.toString();
      if (receiverIsMember || receiverIsOwner) {
        return res.status(400).json({ error: `${receiver.name} is already a member of this hackathon team.` });
      }

      // Rule: Capacity check
      const currentCount = hTeam.filledCount || hTeam.members.length || 1;
      const capacity = hTeam.totalCapacity || 4;
      if (currentCount >= capacity) {
        return res.status(400).json({ error: `Team "${targetTeamName}" is already full (${capacity} members).` });
      }

      // Rule: Duplicate pending check
      const existing = await Invitation.findOne({
        receiver: receiver._id,
        hackathonTeam: targetHackathonTeamId,
        status: "pending",
      });
      if (existing) {
        return res.status(409).json({ error: `A pending invitation to "${targetTeamName}" has already been sent to ${receiver.name}.` });
      }
    }

    // Persist invitation in MongoDB
    const invitation = await Invitation.create({
      sender: req.user._id,
      receiver: receiver._id,
      type: targetType,
      project: targetProjectId || undefined,
      hackathonTeam: targetHackathonTeamId || undefined,
      team: inputTeamId && mongoose.Types.ObjectId.isValid(inputTeamId) ? inputTeamId : undefined,
      teamName: targetTeamName,
      role: role || "Teammate / Contributor",
      message: message || `${req.user.name} invited you to join ${targetTeamName}!`,
      status: "pending",
    });

    // Create real Notification in MongoDB for receiver
    await Notification.create({
      recipient: receiver._id,
      type: "invitation_received",
      title: "New Team Invitation",
      message: `${req.user.name} invited you to join ${targetTeamName}`,
      relatedId: invitation._id.toString(),
      read: false,
    });

    // Send email invitation to User B's registered email address
    try {
      await sendTeamInvitationEmail({
        receiverEmail: receiver.email,
        receiverName: receiver.name,
        senderName: req.user.name,
        teamName: targetTeamName,
        role: role || "Teammate / Contributor",
        message: message || "",
        invitationId: invitation._id.toString(),
      });
    } catch (emailErr) {
      console.warn("Email dispatch error:", emailErr.message);
    }

    const populated = await Invitation.findById(invitation._id)
      .populate("sender", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("receiver", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("project", "title categoryBadge")
      .populate("hackathonTeam", "teamName title hackathonTitle");

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${receiver.name} for ${targetTeamName}.`,
      invitation: populated,
    });
  } catch (err) {
    console.error("Create invitation error:", err);
    return res.status(500).json({ error: "Failed to dispatch invitation.", details: err.message });
  }
});

// PATCH /api/invitations/:id - Accept or reject invitation
router.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invitation ID." });
    }

    const invitation = await Invitation.findById(id)
      .populate("project")
      .populate("hackathonTeam")
      .populate("team");

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    // Rule: Only the intended receiver can accept/reject the invitation
    if (invitation.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Forbidden: Only the invited receiver can respond to this invitation." });
    }

    // Prevent re-processing already decided invitations
    if (invitation.status !== "pending") {
      return res.status(400).json({ error: `This invitation has already been ${invitation.status}.` });
    }

    invitation.status = status;
    await invitation.save();

    const teamTitle = invitation.teamName || invitation.project?.title || invitation.hackathonTeam?.teamName || "the team";

    // If accepted: add receiver to the correct team in MongoDB & update member count
    if (status === "accepted") {
      if (invitation.project) {
        const project = await Project.findById(invitation.project._id || invitation.project);
        if (project) {
          const currentMemberIds = project.members.map((m) => m.toString());
          if (!currentMemberIds.includes(req.user._id.toString())) {
            project.members.push(req.user._id);
            project.filledCount = Math.min(project.totalCapacity || 4, (project.filledCount || 1) + 1);
            if (project.filledCount >= (project.totalCapacity || 4)) {
              project.recruitingBadge = "Squad Full";
            }
            await project.save();
          }
        }
      }

      if (invitation.hackathonTeam) {
        const hTeam = await HackathonTeam.findById(invitation.hackathonTeam._id || invitation.hackathonTeam);
        if (hTeam) {
          const currentMemberIds = hTeam.members.map((m) => m.toString());
          if (!currentMemberIds.includes(req.user._id.toString())) {
            hTeam.members.push(req.user._id);
            hTeam.filledCount = Math.min(hTeam.totalCapacity || 4, (hTeam.filledCount || 1) + 1);
            if (hTeam.filledCount >= (hTeam.totalCapacity || 4)) {
              hTeam.status = "full";
            }
            await hTeam.save();
          }
        }
      }

      if (invitation.team) {
        const team = await Team.findById(invitation.team._id || invitation.team);
        if (team) {
          const currentMemberIds = team.members.map((m) => m.toString());
          if (!currentMemberIds.includes(req.user._id.toString())) {
            team.members.push(req.user._id);
            await team.save();
          }
        }
      }

      // Create a real Notification for the sender
      await Notification.create({
        recipient: invitation.sender,
        type: "invitation_accepted",
        title: "Invitation Accepted! 🤝",
        message: `${req.user.name} accepted your invitation to join ${teamTitle}.`,
        relatedId: invitation._id.toString(),
        read: false,
      });
    } else if (status === "rejected") {
      // Create a real Notification for the sender
      await Notification.create({
        recipient: invitation.sender,
        type: "invitation_rejected",
        title: "Invitation Declined",
        message: `${req.user.name} was unable to accept your invitation to join ${teamTitle}.`,
        relatedId: invitation._id.toString(),
        read: false,
      });
    }

    const updated = await Invitation.findById(id)
      .populate("sender", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("receiver", "name email avatar college university role roleTitle github linkedin showEmailToTeam")
      .populate("project", "title categoryBadge members totalCapacity filledCount")
      .populate("hackathonTeam", "teamName title members totalCapacity filledCount");

    return res.json({
      success: true,
      message: `Invitation ${status} successfully.`,
      invitation: updated,
    });
  } catch (err) {
    console.error("Respond invitation error:", err);
    return res.status(500).json({ error: "Failed to update invitation.", details: err.message });
  }
});

export default router;
