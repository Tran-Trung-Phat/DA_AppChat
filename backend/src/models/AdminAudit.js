import mongoose from "mongoose";

const adminAuditSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: String,
    detail: { type: String, default: "" },
    ip: String,
  },
  { timestamps: true }
);

export default mongoose.model("AdminAudit", adminAuditSchema);
