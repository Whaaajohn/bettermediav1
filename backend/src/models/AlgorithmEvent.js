import mongoose from "mongoose";

const algorithmEventSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    user: { type: String, required: true, index: true },
    post: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: [
        "view",
        "long_view",
        "like",
        "dislike",
        "comment",
        "save",
        "repost",
        "share",
        "hide",
        "not_interested",
        "report",
        "follow_author",
        "open_hashtag",
        "click_profile",
        "block_author",
      ],
      required: true,
      index: true,
    },
    dwellTimeMs: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["for_you", "following", "hashtag", "profile", "search", "language", "trending", "discover"],
      default: "for_you",
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

algorithmEventSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.AlgorithmEvent || mongoose.model("AlgorithmEvent", algorithmEventSchema);
