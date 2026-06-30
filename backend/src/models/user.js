import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashedPassword: {
      type: String,
      required: false,
      default: null,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String, // Link CDN để hiển thị hình
    },
    avatarID: {
      type: String, // Cloudinary public_id để xóa hình ảnh
    },
    coverUrl: {
      type: String, // Link ảnh bìa
      default: "",
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    phone: {
      type: String,
      sparse: true, // cho phép null nhưng không được trùng
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    adminRole: {
      type: String,
      enum: ["super_admin", "moderator", "support"],
    },
    banReason: {
      type: String,
      default: "",
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    blockList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", schema);
export default User;
