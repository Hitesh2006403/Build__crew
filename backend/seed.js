import bcrypt from "bcryptjs";
import User from "./models/User.js";

/**
 * Ensures founder administrator accounts exist in MongoDB with role: "admin".
 * Passwords are synchronized with .env definitions.
 * No mock data, demo students, or hardcoded projects are seeded.
 */
export const seedFounderAdmins = async () => {
  try {
    const admin1Email = (process.env.ADMIN1_EMAIL || "").trim().toLowerCase();
    const admin1Password = (process.env.ADMIN1_PASSWORD || "").trim();
    const admin2Email = (process.env.ADMIN2_EMAIL || "").trim().toLowerCase();
    const admin2Password = (process.env.ADMIN2_PASSWORD || "").trim();

    const founders = [];

    if (admin1Email && admin1Password) {
      founders.push({
        email: admin1Email,
        password: admin1Password,
        name: process.env.ADMIN1_NAME || "Administrator",
        roleTitle: "Co-Founder & Platform Architect",
        college: "",
        branch: "",
        role: "admin",
        avatar: "",
        profileImage: "",
        bio: "BuildCrew Administrator.",
      });
    }

    if (admin2Email && admin2Password) {
      founders.push({
        email: admin2Email,
        password: admin2Password,
        name: process.env.ADMIN2_NAME || "Administrator",
        roleTitle: "Co-Founder & Lead Engineer",
        college: "",
        branch: "",
        role: "admin",
        avatar: "",
        profileImage: "",
        bio: "BuildCrew Administrator.",
      });
    }

    for (const f of founders) {
      const existing = await User.findOne({ email: f.email });
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(f.password, salt);
        await User.create({
          ...f,
          password: hashedPassword,
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        existing.password = await bcrypt.hash(f.password, salt);
        existing.role = "admin";
        await existing.save();
      }
    }
  } catch (err) {
    // Silent catch
  }
};
