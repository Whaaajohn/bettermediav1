import mongoose from "mongoose";

const languageGroupSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["native_language", "learning_language"],
      required: true,
      index: true,
    },
    language: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    memberIds: { type: [String], default: [] },
    autoMemberIds: { type: [String], default: [] },
    manualMemberIds: { type: [String], default: [] },
    postCount: { type: Number, default: 0 },
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.LanguageGroup ||
  mongoose.model("LanguageGroup", languageGroupSchema);
