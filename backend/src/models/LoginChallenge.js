import mongoose from "mongoose";

const loginChallengeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    deviceMeta: { type: Object, default: {} },
    usedAt: Date,
    revokedAt: Date,
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.LoginChallenge || mongoose.model("LoginChallenge", loginChallengeSchema);
