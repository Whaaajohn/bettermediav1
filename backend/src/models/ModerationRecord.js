import mongoose from "mongoose";

const moderationRecordSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    actor: { type: String, required: true, index: true },
    targetUser: { type: String, required: true, index: true },
    targetType: { type: String, default: "user" },
    targetId: { type: String, default: "" },
    type: { type: String, required: true, index: true },
    reason: { type: String, default: "" },
    days: Number,
    until: Date,
    result: { type: String, default: "applied" },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.ModerationRecord || mongoose.model("ModerationRecord", moderationRecordSchema);
