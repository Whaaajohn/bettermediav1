import mongoose from "mongoose";

const hashtagSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, unique: true, lowercase: true, index: true },
    postCount: { type: Number, default: 0 },
    dailyPostCount: { type: Number, default: 0 },
    weeklyPostCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: true },
    category: { type: String, default: "general", index: true },
    language: { type: String, default: "all", index: true },
    blocked: { type: Boolean, default: false, index: true },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.Hashtag || mongoose.model("Hashtag", hashtagSchema);
