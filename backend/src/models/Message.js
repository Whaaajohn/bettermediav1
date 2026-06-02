import mongoose from "mongoose";

const editHistorySchema = new mongoose.Schema(
  {
    text: String,
    editedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    clientId: { type: String, default: null, index: true },
    status: { type: String, default: "sent" },
    sender: { type: String, required: true, index: true },
    receiver: { type: String, required: true, index: true },
    recipient: { type: String, index: true },
    conversationId: { type: String, required: true, index: true },
    text: { type: String, default: "", maxlength: 5000 },
    media: Object,
    voice: Object,
    gif: Object,
    sharedPostId: { type: String, default: null, index: true },
    replyTo: { type: String, default: null },
    reactions: { type: [Object], default: [] },
    readBy: { type: [String], default: [] },
    editedAt: Date,
    editHistory: { type: [editHistorySchema], default: [] },
    deletedAt: Date,
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
