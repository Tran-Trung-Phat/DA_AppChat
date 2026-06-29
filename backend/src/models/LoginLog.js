import mongoose from "mongoose";

const loginLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    identity: String,
    ip: String,
    userAgent: String,
    success: { type: Boolean, required: true },
    reason: String,
  },
  { timestamps: true }
);

export default mongoose.model("LoginLog", loginLogSchema);
