import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    user: { type: String, required: true, index: true },
    actorId: { type: String, default: null },
    type: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    metadata: { type: Object, default: {} },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
