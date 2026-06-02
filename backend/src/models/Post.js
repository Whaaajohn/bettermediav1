import mongoose from "mongoose";

const detectedTagSchema = new mongoose.Schema(
  {
    name: String,
    confidence: Number,
    source: String,
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    filename: String,
    mimeType: String,
    kind: { type: String, enum: ["image", "video", "audio", "file"], default: "file" },
    order: { type: Number, default: 0 },
    size: Number,
    driver: { type: String, default: "local" },
  },
  { _id: false }
);

const songSchema = new mongoose.Schema(
  {
    provider: String,
    providerId: String,
    title: String,
    artist: String,
    album: String,
    artworkUrl: String,
    previewUrl: String,
    sourceUrl: String,
    explicit: { type: Boolean, default: false },
    durationMs: { type: Number, default: 30000 },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    clientId: { type: String, default: null, index: true },
    status: { type: String, default: "posted" },
    author: { type: String, required: true, index: true },
    text: { type: String, default: "", maxlength: 2000 },
    content: { type: String, default: "", maxlength: 2000 },
    caption: { type: String, default: "", maxlength: 2000 },
    media: mediaSchema,
    mediaItems: { type: [mediaSchema], default: [] },
    thumbnail: String,
    song: songSchema,
    audioLabel: { type: String, default: "" },
    mediaType: { type: String, enum: ["text", "image", "video", "audio", "file"], default: "text" },
    language: { type: String, default: "english", index: true },
    targetLanguages: { type: [String], default: [] },
    hashtags: { type: [String], default: [], index: true },
    detectedTags: { type: [detectedTagSchema], default: [] },
    finalTags: { type: [String], default: [], index: true },
    category: { type: String, default: "general", index: true },
    subcategory: { type: String, default: "" },
    tone: { type: String, default: "neutral" },
    visibility: { type: String, enum: ["public", "followers", "private"], default: "public", index: true },
    isArchived: { type: Boolean, default: false, index: true },
    archived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    repostOf: { type: String, default: null, index: true },
    likes: { type: [String], default: [] },
    dislikes: { type: [String], default: [] },
    saves: { type: [String], default: [] },
    views: { type: [String], default: [] },
    hiddenBy: { type: [String], default: [] },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    repostCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 60 },
    spamScore: { type: Number, default: 0 },
    hotScore: { type: Number, default: 0, index: true },
    removedFromFeed: { type: Boolean, default: false },
    downranked: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);

postSchema.index({ createdAt: -1, hotScore: -1 });
postSchema.index({ language: 1, finalTags: 1, createdAt: -1 });

export default mongoose.models.Post || mongoose.model("Post", postSchema);
