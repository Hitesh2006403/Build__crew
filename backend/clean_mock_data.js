import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Project from "./models/Project.js";
import Hackathon from "./models/Hackathon.js";
import HackathonTeam from "./models/HackathonTeam.js";
import Team from "./models/Team.js";
import Application from "./models/Application.js";
import Invitation from "./models/Invitation.js";
import Notification from "./models/Notification.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

// Founder / Admin accounts and real user accounts explicitly preserved
const PRESERVED_EMAILS = [
  (process.env.ADMIN1_EMAIL || "hiteshav2006@gmail.com").toLowerCase().trim(),
  (process.env.ADMIN2_EMAIL || "jhs498969@gmail.com").toLowerCase().trim(),
  "geethageetha74069@gmail.com", // Jayanth real student account
];

async function cleanDatabase() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  console.log("\n--- PRESERVED ACCOUNTS ---");
  console.log(PRESERVED_EMAILS);

  // 1. Delete demo users
  const usersToDelete = await User.find({
    email: { $nin: PRESERVED_EMAILS },
    role: { $ne: "admin" },
  });
  console.log(`\nFound ${usersToDelete.length} demo/mock users to remove:`);
  usersToDelete.forEach(u => console.log(` - ${u.name} (${u.email}, role: ${u.role})`));

  const userDeleteResult = await User.deleteMany({
    email: { $nin: PRESERVED_EMAILS },
    role: { $ne: "admin" },
  });
  console.log(`Deleted demo users: ${userDeleteResult.deletedCount}`);

  // 2. Clean fake/dummy colleges on admin accounts if any
  await User.updateMany(
    { role: "admin" },
    { $set: { college: "", branch: "" } }
  );

  // 3. Delete dummy projects
  const projResult = await Project.deleteMany({});
  console.log(`Deleted dummy projects: ${projResult.deletedCount}`);

  // 4. Delete dummy hackathons
  const hackResult = await Hackathon.deleteMany({});
  console.log(`Deleted dummy hackathons: ${hackResult.deletedCount}`);

  // 5. Delete dummy hackathon teams and teams
  const htResult = await HackathonTeam.deleteMany({});
  console.log(`Deleted dummy hackathon teams: ${htResult.deletedCount}`);

  const tResult = await Team.deleteMany({});
  console.log(`Deleted dummy teams: ${tResult.deletedCount}`);

  // 6. Delete dummy applications
  const appResult = await Application.deleteMany({});
  console.log(`Deleted dummy applications: ${appResult.deletedCount}`);

  // 7. Delete dummy invitations
  const invResult = await Invitation.deleteMany({});
  console.log(`Deleted dummy invitations: ${invResult.deletedCount}`);

  // 8. Delete dummy notifications
  const notifResult = await Notification.deleteMany({});
  console.log(`Deleted dummy notifications: ${notifResult.deletedCount}`);

  console.log("\n--- CURRENT REMAINING USERS IN MONGODB ---");
  const remainingUsers = await User.find({}, "name email role college");
  console.log(JSON.stringify(remainingUsers, null, 2));

  console.log("\n--- VERIFICATION OF REMAINING COLLECTIONS ---");
  console.log("Projects in MongoDB:", await Project.countDocuments());
  console.log("Hackathons in MongoDB:", await Hackathon.countDocuments());
  console.log("Teams in MongoDB:", await Team.countDocuments());
  console.log("Applications in MongoDB:", await Application.countDocuments());
  console.log("Invitations in MongoDB:", await Invitation.countDocuments());
  console.log("Notifications in MongoDB:", await Notification.countDocuments());

  await mongoose.disconnect();
  console.log("\nDATABASE CLEANED FOR REAL-WORLD TESTING! ✨");
}

cleanDatabase().catch(err => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
