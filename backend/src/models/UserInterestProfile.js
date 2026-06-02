import mongoose from "mongoose";

const userInterestProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true, unique: true, index: true },
    interests: { type: [String], default: [] },
    mutedInterests: { type: [String], default: [] },
    weights: { type: Map, of: Number, default: {} },
    preferredLanguages: { type: [String], default: [] },
    feedMode: { type: String, default: "balanced" },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.UserInterestProfile ||
  mongoose.model("UserInterestProfile", userInterestProfileSchema);
