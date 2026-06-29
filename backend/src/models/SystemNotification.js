import mongoose from "mongoose";

const systemNotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    link: { type: String, default: "" },
    audience: {
      type: String,
      enum: ["all", "active", "admins"],
      default: "all",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent"],
      default: "draft",
      index: true,
    },
    scheduledAt: Date,
    sentAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SystemNotification", systemNotificationSchema);
