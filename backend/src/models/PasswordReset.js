import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Tự động xóa document khi hết hạn
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordReset", passwordResetSchema);
