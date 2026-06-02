import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    callId: { type: String, required: true, unique: true, index: true },
    callerId: { type: String, required: true, index: true },
    calleeId: { type: String, required: true, index: true },
    participants: { type: [String], default: [] },
    mode: { type: String, enum: ["audio", "video"], default: "video" },
    status: { type: String, default: "started", index: true },
    startedAt: Date,
    acceptedAt: Date,
    endedAt: Date,
    durationMs: { type: Number, default: 0 },
    endReason: { type: String, default: "" },
    mediaState: { type: Object, default: {} },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.CallLog || mongoose.model("CallLog", callLogSchema);
