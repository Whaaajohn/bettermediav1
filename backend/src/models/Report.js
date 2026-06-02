import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    reporter: { type: String, required: true, index: true },
    targetType: { type: String, enum: ["post", "comment", "message", "user", "bug"], required: true, index: true },
    targetId: { type: String, required: true, index: true },
    category: { type: String, default: "Other", index: true },
    reason: { type: String, default: "", maxlength: 1000 },
    status: { type: String, enum: ["open", "reviewing", "resolved", "dismissed"], default: "open", index: true },
    resolution: { type: String, default: "" },
    resolvedBy: String,
    resolvedAt: Date,
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.Report || mongoose.model("Report", reportSchema);
