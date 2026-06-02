import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    actorId: { type: String, index: true },
    actorType: { type: String, enum: ["user", "bot", "system"], default: "user" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    reason: { type: String, default: "" },
    result: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export default mongoose.models.ModerationLog || mongoose.model("ModerationLog", moderationLogSchema);
