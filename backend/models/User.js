import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    college: {
      type: String,
      default: "",
    },
    university: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "",
    },
    major: {
      type: String,
      default: "",
    },
    semester: {
      type: Number,
      default: 1,
    },
    graduationYear: {
      type: String,
      default: "2026",
    },
    year: {
      type: String,
      default: "'26",
    },
    roleTitle: {
      type: String,
      default: "Student Builder",
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    chatUsername: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    lookingFor: {
      type: String,
      default: "",
    },
    match: {
      type: String,
      default: "",
    },
    github: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
    showEmailToTeam: {
      type: Boolean,
      default: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to remove password and guarantee avatar/profileImage synchronization
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  if (user.profileImage && !user.avatar) user.avatar = user.profileImage;
  if (user.avatar && !user.profileImage) user.profileImage = user.avatar;
  return user;
};

userSchema.pre("save", function () {
  if (this.profileImage && !this.avatar) this.avatar = this.profileImage;
  if (this.avatar && !this.profileImage) this.profileImage = this.avatar;
});

const User = mongoose.model("User", userSchema);

export default User;
