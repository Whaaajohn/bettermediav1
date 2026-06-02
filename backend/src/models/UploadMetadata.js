import mongoose from "mongoose";

const uploadMetadataSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    filename: { type: String, required: true, index: true },
    url: { type: String, default: "" },
    publicUrl: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    driver: { type: String, default: "local", index: true },
    sourceType: { type: String, default: "unknown", index: true },
    sourceId: { type: String, default: "", index: true },
    missingFile: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.UploadMetadata ||
  mongoose.model("UploadMetadata", uploadMetadataSchema);
