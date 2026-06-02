import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true },
    deviceId: { type: String, required: true, index: true },
    deviceName: { type: String, default: "Unknown device" },
    browser: { type: String, default: "Unknown browser" },
    os: { type: String, default: "Unknown OS" },
    ipAddress: { type: String, default: "" },
    approximateLocation: { type: String, default: "" },
    locationDetails: {
      city: { type: String, default: "" },
      region: { type: String, default: "" },
      country: { type: String, default: "" },
      countryCode: { type: String, default: "" },
      latitude: { type: String, default: "" },
      longitude: { type: String, default: "" },
      timezone: { type: String, default: "" },
    },
    userAgent: { type: String, default: "" },
    trusted: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    revokedAt: Date,
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, strict: false }
);

export default mongoose.models.UserSession || mongoose.model("UserSession", userSessionSchema);
