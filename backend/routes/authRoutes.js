import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { generateToken, authenticateUser } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "buildcrew_super_secret_jwt_key_2026_secure";

// POST /api/auth/register - Register a new student
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      college,
      branch,
      semester,
      graduationYear,
      bio,
      skills,
      interests,
      github,
      linkedin,
      profileImage,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database is connecting. Please try again in a moment." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    // Parse skills & interests
    const parsedSkills = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const parsedInterests = Array.isArray(interests)
      ? interests
      : typeof interests === "string"
      ? interests.split(",").map((i) => i.trim()).filter(Boolean)
      : [];

    // CRITICAL: Public registration is strictly locked to role='student'
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      college: college ? college.trim() : "Collegiate Member",
      university: college ? college.trim() : "Collegiate Member",
      branch: branch ? branch.trim() : "Engineering",
      major: branch ? branch.trim() : "Engineering",
      semester: Number(semester) || 1,
      graduationYear: graduationYear ? graduationYear.trim() : "2026",
      year: graduationYear ? `'${graduationYear.trim().slice(-2)}` : "'26",
      bio: bio ? bio.trim() : "",
      skills: parsedSkills,
      interests: parsedInterests,
      github: github ? github.trim() : "",
      linkedin: linkedin ? linkedin.trim() : "",
      profileImage: profileImage || "",
      avatar: profileImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuBirUkNQSo04g_tpOZ4BCEqxhIS1X_JeuPCz7HOuaAg-iBZjD079_5Kw5JH_beVshiDR-hGgf25xxHWHIOiujBaIs-w4YI0ynogQcCH-ChPBSE6SQTry_Dqz24c73Jk7DeMfwiJy0dTYKPf4u-A8WVNw1oUjo6ssG1p_WKvOPmg1OVEotk4p7HgClGq2FLb6UoHwks2MTWuddYD2hBI5uOVcjsqA5gleuV5YGmocfJVn1MpOeHrvsPd",
      role: "student", // NEVER allow admin on register
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: "Student account created successfully",
      token,
      user: newUser.toJSON(),
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Server error during registration.", details: err.message });
  }
});

// POST /api/auth/login - Universal login for Student and Admin
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Load admin credentials from .env
    const admin1Email = (process.env.ADMIN1_EMAIL || "").trim().toLowerCase();
    const admin1Password = (process.env.ADMIN1_PASSWORD || "").trim();
    const admin2Email = (process.env.ADMIN2_EMAIL || "").trim().toLowerCase();
    const admin2Password = (process.env.ADMIN2_PASSWORD || "").trim();

    const isAdminMatch =
      (admin1Email && cleanEmail === admin1Email && cleanPassword === admin1Password) ||
      (admin2Email && cleanEmail === admin2Email && cleanPassword === admin2Password);

    // If matches .env Admin credentials, authenticate with role: "admin"
    if (isAdminMatch) {
      const adminName = cleanEmail === admin1Email 
        ? (process.env.ADMIN1_NAME || "Administrator") 
        : (process.env.ADMIN2_NAME || "Administrator");
      const adminRoleTitle = cleanEmail === admin1Email 
        ? "Co-Founder & Platform Architect" 
        : "Co-Founder & Lead Engineer";
      const adminAvatar = "";

      if (mongoose.connection.readyState === 1) {
        try {
          let dbAdmin = await User.findOne({ email: cleanEmail });
          if (!dbAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(cleanPassword, salt);
            dbAdmin = await User.create({
              name: adminName,
              email: cleanEmail,
              password: hashedPassword,
              role: "admin",
              roleTitle: adminRoleTitle,
              college: "",
              university: "",
              branch: "",
              major: "",
              avatar: adminAvatar,
              profileImage: adminAvatar,
              bio: "BuildCrew Founder & Collegiate Platform Lead.",
            });
          } else {
            let changed = false;
            if (dbAdmin.role !== "admin") {
              dbAdmin.role = "admin";
              changed = true;
            }
            const isPwMatch = await bcrypt.compare(cleanPassword, dbAdmin.password);
            if (!isPwMatch) {
              const salt = await bcrypt.genSalt(10);
              dbAdmin.password = await bcrypt.hash(cleanPassword, salt);
              changed = true;
            }
            if (changed) {
              await dbAdmin.save();
            }
          }

          const token = generateToken(dbAdmin);
          return res.json({
            success: true,
            token,
            user: dbAdmin.toJSON(),
          });
        } catch (dbErr) {
          console.warn("DB write warning during admin login:", dbErr.message);
        }
      }

      // Fallback if DB is not ready yet
      const fallbackAdmin = {
        _id: "admin-founder-env",
        id: "admin-founder-env",
        name: adminName,
        email: cleanEmail,
        role: "admin",
        roleTitle: adminRoleTitle,
        college: "",
        university: "",
        branch: "",
        avatar: adminAvatar,
        profileImage: adminAvatar,
      };

      const token = jwt.sign(fallbackAdmin, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        success: true,
        token,
        user: fallbackAdmin,
      });
    }

    // Regular User Login
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database is connecting. Please try again in a moment." });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login.", details: err.message });
  }
});

// POST /api/auth/google - Authenticate with Google
router.post("/google", async (req, res) => {
  try {
    const { email, name, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Google email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if Google account matches .env Admin credentials
    const admin1Email = (process.env.ADMIN1_EMAIL || "").trim().toLowerCase();
    const admin2Email = (process.env.ADMIN2_EMAIL || "").trim().toLowerCase();
    const isAdmin = Boolean((admin1Email && cleanEmail === admin1Email) || (admin2Email && cleanEmail === admin2Email));

    const adminName = cleanEmail === admin1Email 
      ? (process.env.ADMIN1_NAME || "Administrator") 
      : (process.env.ADMIN2_NAME || "Administrator");
    const adminRoleTitle = cleanEmail === admin1Email 
      ? "Co-Founder & Platform Architect" 
      : "Co-Founder & Lead Engineer";
    const adminAvatar = "";

    if (mongoose.connection.readyState === 1) {
      let user = await User.findOne({ email: cleanEmail });

      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const randomPassword = await bcrypt.hash(Math.random().toString(36).substring(2) + Date.now(), salt);
        const displayName = name ? name.trim() : (isAdmin ? adminName : (cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ") || "Student Builder"));

        user = await User.create({
          name: displayName,
          email: cleanEmail,
          password: randomPassword,
          college: "",
          university: "",
          branch: "",
          major: "",
          semester: 1,
          graduationYear: "2026",
          year: "'26",
          role: isAdmin ? "admin" : "student",
          roleTitle: isAdmin ? adminRoleTitle : "Student Builder",
          avatar: avatar || "",
          profileImage: avatar || "",
        });
      } else if (isAdmin && user.role !== "admin") {
        user.role = "admin";
        await user.save();
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        message: "Google sign-in successful",
        token,
        user: user.toJSON(),
      });
    }

    // Fallback if DB is connecting
    if (isAdmin) {
      const fallbackAdmin = {
        _id: "admin-founder-env",
        id: "admin-founder-env",
        name: adminName,
        email: cleanEmail,
        role: "admin",
        roleTitle: adminRoleTitle,
        college: "",
        university: "",
        branch: "",
        avatar: adminAvatar,
        profileImage: adminAvatar,
      };
      const token = jwt.sign(fallbackAdmin, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        success: true,
        message: "Google sign-in successful (admin)",
        token,
        user: fallbackAdmin,
      });
    }

    return res.status(503).json({ error: "Database is connecting. Please try again in a moment." });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "Server error during Google login.", details: err.message });
  }
});

// POST /api/auth/forgot-password - Validate email for password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Please enter your email address." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ error: "No user found with that email address." });
    }
    return res.json({
      success: true,
      message: `Password reset instructions sent for ${cleanEmail}.`,
      email: cleanEmail,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Server error during forgot password." });
  }
});

// POST /api/auth/reset-password - Reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ error: "Account not found for password reset." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword.trim(), salt);
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully! You can now log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Server error during password reset." });
  }
});

// GET /api/auth/me - Verify session & fetch authenticated user
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const userJson = req.user.toJSON ? req.user.toJSON() : req.user;
    return res.json({
      success: true,
      user: userJson,
    });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch user session." });
  }
});

export default router;
