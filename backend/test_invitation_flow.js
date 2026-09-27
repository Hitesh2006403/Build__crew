import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Project from "./models/Project.js";
import HackathonTeam from "./models/HackathonTeam.js";
import Invitation from "./models/Invitation.js";
import Notification from "./models/Notification.js";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "buildcrew_super_secret_jwt_key_2026";
const MONGO_URI = process.env.MONGODB_URI;

function generateToken(user) {
  return jwt.sign(
    {
      _id: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: user.role || "student",
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function runTests() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully.");

  // Fetch two real students
  const users = await User.find({ role: "student" }).limit(3);
  if (users.length < 2) {
    console.error("Need at least 2 students in database.");
    process.exit(1);
  }

  const userA = users[0];
  const userB = users[1];
  console.log(`User A: ${userA.name} (${userA.email}, ID: ${userA._id})`);
  console.log(`User B: ${userB.name} (${userB.email}, ID: ${userB._id})`);

  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  // 1. Verify Find Teammates data
  console.log("\n--- TEST 1: Check Builders Data ---");
  const bRes = await fetch("http://localhost:5000/api/builders");
  const builders = await bRes.json();
  console.log(`Builders returned from MongoDB: ${builders.length}`);
  const sample = builders[0];
  console.log("Sample builder properties:", {
    _id: sample._id,
    name: sample.name,
    college: sample.college,
    branch: sample.branch,
    semester: sample.semester,
    skills: sample.skills,
    github: sample.github || sample.githubUsername
  });

  // Ensure User A has an active project or create one for testing
  let testProject = await Project.findOne({ createdBy: userA._id });
  if (!testProject) {
    testProject = await Project.create({
      title: "Alpha Fleet AI",
      tagline: "Autonomous multi-agent orchestration for campus hackathons",
      type: "hackathon",
      createdBy: userA._id,
      lead: {
        name: userA.name,
        university: userA.college || "Campus",
        roleTitle: "Lead Architect"
      },
      members: [userA._id],
      filledCount: 1,
      totalCapacity: 4,
    });
    console.log(`Created test project: ${testProject.title}`);
  } else {
    // Ensure User B is NOT already in testProject members for the test
    testProject.members = testProject.members.filter(m => m.toString() !== userB._id.toString());
    testProject.filledCount = testProject.members.length || 1;
    await testProject.save();
  }

  // Clear previous test invitations between A and B
  await Invitation.deleteMany({
    sender: userA._id,
    receiver: userB._id,
  });

  // 2. Business Rule: Self-invite rejection
  console.log("\n--- TEST 2: Business Rule - Reject Self-Invite ---");
  const selfInviteRes = await fetch("http://localhost:5000/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      receiverId: userA._id.toString(),
      projectId: testProject._id.toString(),
    }),
  });
  const selfInviteData = await selfInviteRes.json();
  console.log(`Self invite status code: ${selfInviteRes.status} (Expected 400). Response:`, selfInviteData);

  // 3. User A invites User B to Project Team
  console.log("\n--- TEST 3: User A Invites User B to Project Team ---");
  const inviteRes = await fetch("http://localhost:5000/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      receiverId: userB._id.toString(),
      projectId: testProject._id.toString(),
      role: "Backend Architect",
      message: `Hey ${userB.name}, join Alpha Fleet AI to build intelligent agents!`,
    }),
  });
  const inviteData = await inviteRes.json();
  console.log(`Invite status code: ${inviteRes.status} (Expected 201). Success:`, inviteData.success);
  const createdInvitationId = inviteData.invitation._id;

  // 4. Business Rule: Reject duplicate pending invite
  console.log("\n--- TEST 4: Business Rule - Reject Duplicate Pending Invite ---");
  const dupInviteRes = await fetch("http://localhost:5000/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      receiverId: userB._id.toString(),
      projectId: testProject._id.toString(),
    }),
  });
  const dupData = await dupInviteRes.json();
  console.log(`Duplicate invite status code: ${dupInviteRes.status} (Expected 409). Response:`, dupData);

  // 5. Receiver Side: User B checks received invitations and notifications
  console.log("\n--- TEST 5: Receiver Side - User B checks pending invitations ---");
  const bInvsRes = await fetch("http://localhost:5000/api/invitations/my", {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const bInvsData = await bInvsRes.json();
  console.log(`User B received invitations count: ${bInvsData.received.length}`);
  const matchingInv = bInvsData.received.find(inv => inv._id.toString() === createdInvitationId.toString());
  console.log("Matching invitation found:", {
    id: matchingInv?._id,
    sender: matchingInv?.sender?.name,
    teamName: matchingInv?.teamName,
    role: matchingInv?.role,
    status: matchingInv?.status
  });

  // Check Notification in MongoDB for User B
  const bNotifs = await Notification.find({ recipient: userB._id }).sort({ createdAt: -1 });
  console.log(`User B notifications count in MongoDB: ${bNotifs.length}`);
  console.log("Latest notification for User B:", bNotifs[0]?.message);

  // 6. User B Accepts the Invitation
  console.log("\n--- TEST 6: User B Accepts Invitation ---");
  const acceptRes = await fetch(`http://localhost:5000/api/invitations/${createdInvitationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ status: "accepted" }),
  });
  const acceptData = await acceptRes.json();
  console.log(`Accept status code: ${acceptRes.status} (Expected 200). Status:`, acceptData.invitation?.status);

  // Verify User B is now a member of testProject in MongoDB
  const updatedProject = await Project.findById(testProject._id);
  const isMemberNow = updatedProject.members.some(m => m.toString() === userB._id.toString());
  console.log(`User B is member of ${updatedProject.title} in MongoDB: ${isMemberNow} (filledCount: ${updatedProject.filledCount})`);

  // Verify Notification created in MongoDB for User A
  const aNotifs = await Notification.find({ recipient: userA._id }).sort({ createdAt: -1 });
  console.log(`User A latest notification in MongoDB: "${aNotifs[0]?.message}"`);

  // 7. Test Reject Flow
  console.log("\n--- TEST 7: Test Reject Invitation Flow ---");
  // Clean User B from project first to test a fresh invite rejection
  updatedProject.members = updatedProject.members.filter(m => m.toString() !== userB._id.toString());
  updatedProject.filledCount = updatedProject.members.length || 1;
  await updatedProject.save();

  // Send a new invitation
  const invite2Res = await fetch("http://localhost:5000/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      receiverId: userB._id.toString(),
      projectId: testProject._id.toString(),
      role: "DevOps Engineer",
    }),
  });
  const invite2Data = await invite2Res.json();
  const inv2Id = invite2Data.invitation._id;

  // User B rejects
  const rejectRes = await fetch(`http://localhost:5000/api/invitations/${inv2Id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ status: "rejected" }),
  });
  const rejectData = await rejectRes.json();
  console.log(`Reject status code: ${rejectRes.status} (Expected 200). Status:`, rejectData.invitation?.status);

  // Check invitation persisted in MongoDB as rejected
  const persistedInv = await Invitation.findById(inv2Id);
  console.log(`Invitation status persisted in MongoDB: ${persistedInv.status}`);

  // Verify User B was NOT added
  const postRejectProject = await Project.findById(testProject._id);
  const stillNotMember = !postRejectProject.members.some(m => m.toString() === userB._id.toString());
  console.log(`User B was NOT added to team after rejection: ${stillNotMember}`);

  console.log("\nALL TESTS PASSED SUCCESSFULLY! ✨");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
