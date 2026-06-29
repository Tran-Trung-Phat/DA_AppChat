import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetType: {
      type: String,
      enum: ["user", "message", "group", "story"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "reviewing", "resolved", "rejected"],
      default: "new",
      index: true,
    },
    evidence: {
      type: String,
      default: "",
    },
    internalNote: {
      type: String,
      default: "",
    },
    resolution: {
      type: String,
      default: "",
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    handledAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
