import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "buildcrew_super_secret_jwt_key_2026_secure";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied: Missing or invalid authentication token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // If admin-founder fallback token
    if (decoded.id === "admin-founder-env" || decoded._id === "admin-founder-env") {
      req.user = {
        _id: "admin-founder-env",
        id: "admin-founder-env",
        email: decoded.email,
        name: decoded.name,
        role: "admin",
        toJSON: () => ({
          _id: "admin-founder-env",
          id: "admin-founder-env",
          email: decoded.email,
          name: decoded.name,
          role: "admin",
          roleTitle: "Co-Founder & Platform Architect",
          college: "",
          branch: "",
        }),
      };
      return next();
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id || decoded._id);
      if (user) {
        req.user = user;
        return next();
      }
    }

    if (decoded.role) {
      req.user = {
        _id: decoded.id || decoded._id,
        id: decoded.id || decoded._id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        toJSON: () => ({
          _id: decoded.id || decoded._id,
          id: decoded.id || decoded._id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
        }),
      };
      return next();
    }

    return res.status(401).json({ error: "Access denied: User account not found" });
  } catch (err) {
    return res.status(401).json({ error: "Access denied: Invalid or expired session token", details: err.message });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Administrator privileges required" });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.id === "admin-founder-env" || decoded._id === "admin-founder-env") {
        req.user = {
          _id: "admin-founder-env",
          id: "admin-founder-env",
          email: decoded.email,
          name: decoded.name,
          role: "admin",
        };
        return next();
      }

      if (mongoose.connection.readyState === 1) {
        const user = await User.findById(decoded.id || decoded._id);
        if (user) {
          req.user = user;
          return next();
        }
      }

      if (decoded.role) {
        req.user = {
          _id: decoded.id || decoded._id,
          id: decoded.id || decoded._id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
        };
      }
    }
  } catch {
    // Ignore error for optional authentication
  }
  next();
};
