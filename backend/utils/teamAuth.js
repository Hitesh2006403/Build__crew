import mongoose from "mongoose";
import Team from "../models/Team.js";
import Project from "../models/Project.js";
import HackathonTeam from "../models/HackathonTeam.js";
import User from "../models/User.js";

/**
 * Securely verifies whether a given user is an authorized member or owner of a team.
 * Checks existing Team, Project, and HackathonTeam collections.
 *
 * @param {string|mongoose.Types.ObjectId} userId - The authenticated user's ID
 * @param {string|mongoose.Types.ObjectId} teamId - The team/project ID
 * @param {string} [userRole] - The user's role (admin bypass)
 * @returns {Promise<{ valid: boolean, error?: string, teamId?: any, teamName?: string, members?: Array, entityType?: string }>}
 */
export async function verifyTeamMembership(userId, teamId, userRole = "student") {
  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    return { valid: false, error: "Invalid team identifier." };
  }

  const userObjectIdStr = String(userId);
  const isAdmin = userRole === "admin";

  // 1. Check Team model
  const teamDoc = await Team.findById(teamId);
  if (teamDoc) {
    const isOwner = teamDoc.owner && String(teamDoc.owner) === userObjectIdStr;
    const isMember = Array.isArray(teamDoc.members) && teamDoc.members.some((m) => String(m) === userObjectIdStr);

    if (isOwner || isMember || isAdmin) {
      const allMemberIds = Array.from(
        new Set([
          teamDoc.owner ? String(teamDoc.owner) : null,
          ...(teamDoc.members || []).map((m) => String(m)),
        ].filter(Boolean))
      );

      const populatedMembers = await User.find({ _id: { $in: allMemberIds } })
        .select("name email avatar profileImage role roleTitle college university")
        .lean();

      return {
        valid: true,
        teamId: teamDoc._id,
        teamName: teamDoc.teamName || "Team",
        members: populatedMembers,
        entityType: "Team",
      };
    }

    return { valid: false, error: "Access denied: You are not a member of this team." };
  }

  // 2. Check Project model (projects represent collaboration squads)
  const projectDoc = await Project.findById(teamId);
  if (projectDoc) {
    const isOwner = projectDoc.createdBy && String(projectDoc.createdBy) === userObjectIdStr;
    const isMember = Array.isArray(projectDoc.members) && projectDoc.members.some((m) => String(m) === userObjectIdStr);

    if (isOwner || isMember || isAdmin) {
      const allMemberIds = Array.from(
        new Set([
          projectDoc.createdBy ? String(projectDoc.createdBy) : null,
          ...(projectDoc.members || []).map((m) => String(m)),
        ].filter(Boolean))
      );

      const populatedMembers = await User.find({ _id: { $in: allMemberIds } })
        .select("name email avatar profileImage role roleTitle college university")
        .lean();

      return {
        valid: true,
        teamId: projectDoc._id,
        teamName: projectDoc.title || "Project Team",
        members: populatedMembers,
        entityType: "Project",
      };
    }

    return { valid: false, error: "Access denied: You are not a member of this team." };
  }

  // 3. Check HackathonTeam model (hackathon squads)
  const hackTeamDoc = await HackathonTeam.findById(teamId);
  if (hackTeamDoc) {
    const isOwner = hackTeamDoc.createdBy && String(hackTeamDoc.createdBy) === userObjectIdStr;
    const isMember = Array.isArray(hackTeamDoc.members) && hackTeamDoc.members.some((m) => String(m) === userObjectIdStr);

    if (isOwner || isMember || isAdmin) {
      const allMemberIds = Array.from(
        new Set([
          hackTeamDoc.createdBy ? String(hackTeamDoc.createdBy) : null,
          ...(hackTeamDoc.members || []).map((m) => String(m)),
        ].filter(Boolean))
      );

      const populatedMembers = await User.find({ _id: { $in: allMemberIds } })
        .select("name email avatar profileImage role roleTitle college university")
        .lean();

      return {
        valid: true,
        teamId: hackTeamDoc._id,
        teamName: hackTeamDoc.teamName || hackTeamDoc.title || "Hackathon Squad",
        members: populatedMembers,
        entityType: "HackathonTeam",
      };
    }

    return { valid: false, error: "Access denied: You are not a member of this team." };
  }

  return { valid: false, error: "Team not found." };
}
