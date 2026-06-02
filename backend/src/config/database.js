import { env, isProduction } from "./env.js";

let mongooseConnection = null;
let databaseStatus = {
  driver: env.DB_DRIVER,
  mongoMode: "unknown",
  connected: false,
  fallback: env.DB_DRIVER !== "mongo",
  message: "Not connected yet",
};

export function mongoModeFromUri(uri = "") {
  if (env.MONGO_MODE) return env.MONGO_MODE;
  if (!uri) return "unknown";
  if (uri.startsWith("mongodb+srv://")) return "atlas";
  if (/mongodb:\/\/(127\.0\.0\.1|localhost)(?::\d+)?\//i.test(uri)) return "community";
  if (uri.startsWith("mongodb://")) return "custom";
  return "unknown";
}

export async function connectDatabase() {
  if (env.DB_DRIVER !== "mongo") {
    databaseStatus = {
      driver: env.DB_DRIVER || "local_json",
      mongoMode: "none",
      connected: true,
      fallback: true,
      message: "Using local JSON database",
    };
    return databaseStatus;
  }

  if (!env.MONGO_URI) {
    if (isProduction()) throw new Error("MONGO_URI is required in production.");
    databaseStatus = {
      driver: "local_json",
      mongoMode: "none",
      connected: true,
      fallback: true,
      message: "MONGO_URI missing, using local JSON database",
    };
    return databaseStatus;
  }

  try {
    const mongoose = await import("mongoose");
    mongooseConnection = await mongoose.default.connect(env.MONGO_URI, {
      autoIndex: env.NODE_ENV !== "production",
    });
    await import("../models/index.js");
    databaseStatus = {
      driver: "mongo",
      mongoMode: mongoModeFromUri(env.MONGO_URI),
      connected: true,
      fallback: false,
      message: "MongoDB connected",
    };
  } catch (error) {
    if (isProduction()) throw error;
    databaseStatus = {
      driver: "local_json",
      mongoMode: mongoModeFromUri(env.MONGO_URI),
      connected: true,
      fallback: true,
      message: `MongoDB unavailable locally, using JSON fallback: ${error.message}`,
    };
  }

  return databaseStatus;
}

export function getDatabaseStatus() {
  return databaseStatus;
}

export async function closeDatabase() {
  if (mongooseConnection?.disconnect) {
    await mongooseConnection.disconnect();
  }
}
