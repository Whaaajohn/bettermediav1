import mongoose from "mongoose";

const editHistorySchema = new mongoose.Schema(
  {
    text: String,
    editedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    clientId: { type: String, default: null, index: true },
    status: { type: String, default: "sent" },
    post: { type: String, required: true, index: true },
    author: { type: String, required: true, index: true },
    parentComment: { type: String, default: null, index: true },
    parentId: { type: String, default: null, index: true },
    rootId: { type: String, default: null, index: true },
    depth: { type: Number, default: 0 },
    text: { type: String, required: true, maxlength: 1000 },
    language: { type: String, default: "english" },
    hashtags: { type: [String], default: [] },
    detectedTags: { type: [Object], default: [] },
    likes: { type: [String], default: [] },
    gif: Object,
    pinnedAt: Date,
    pinnedBy: { type: String, default: null },
    likeCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    editedAt: Date,
    editHistory: { type: [editHistorySchema], default: [] },
    deletedAt: Date,
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.Comment || mongoose.model("Comment", commentSchema);
