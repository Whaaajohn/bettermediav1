import mongoose from "mongoose";

const localMirrorRecordSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    collection: { type: String, required: true, index: true },
    sourceId: { type: String, default: "", index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    migratedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false, suppressReservedKeysWarning: true }
);

localMirrorRecordSchema.index({ collection: 1, sourceId: 1 });

export default mongoose.models.LocalMirrorRecord ||
  mongoose.model("LocalMirrorRecord", localMirrorRecordSchema);
