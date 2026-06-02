import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import postRoutes from "./routes/post.route.js";
import modRoutes from "./routes/mod.route.js";
import feedRoutes from "./routes/feed.route.js";
import algorithmRoutes from "./routes/algorithm.route.js";
import hashtagRoutes from "./routes/hashtag.route.js";
import interestRoutes from "./routes/interest.route.js";
import uploadRoutes from "./routes/upload.route.js";
import healthRoutes from "./routes/health.route.js";
import callRoutes from "./routes/call.route.js";
import botRoutes from "./routes/bot.route.js";
import musicRoutes from "./routes/music.route.js";
import languageGroupRoutes from "./routes/languageGroups.route.js";

import { getBotRuntimeSnapshot, getMediaDirectory, initLocalStore } from "./lib/localStore.js";
import { configureSignaling } from "./lib/signaling.js";
import { setBotRuntimeDataProvider, startBotEngine } from "./bots/index.js";
import { env, configuredCorsOrigins, validateEnv } from "./config/env.js";
import { closeDatabase, connectDatabase } from "./config/database.js";
import { closeRedis, connectRedis } from "./config/redis.js";
import { ensureUploadDirectory, getUploadDirectory } from "./config/storage.js";
import { getWorkerStatus } from "./config/workers.js";
import { getSightengineStatus } from "./bots/services/sightengineService.js";
import { root as rootHealth } from "./controllers/health.controller.js";
import { localRateLimit } from "./middleware/rateLimit.middleware.js";
import { serveUploadByFilename } from "./services/storage.service.js";

const app = express();
const PORT = env.PORT;
const ADMIN_PORT = env.ADMIN_PORT;
const HOST = env.HOST;
const allowedOriginPatterns = [
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
  /^https:\/\/[a-z0-9-]+-\d+\.(?:app\.github\.dev|preview\.app\.github\.dev|githubpreview\.dev)$/i,
  /^https:\/\/[a-z0-9-]+-\d+\.[a-z0-9-]+\.devtunnels\.ms$/i,
  /^https:\/\/[a-z0-9-]+\.devtunnels\.ms$/i,
  /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i,
  /^https:\/\/[a-z0-9-]+\.ngrok\.io$/i,
];

const configuredOrigins = configuredCorsOrigins();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};
const server = createServer(app);
const adminApp = express();
const adminServer = createServer(adminApp);

if (env.TRUST_PROXY) {
  app.set("trust proxy", true);
  adminApp.set("trust proxy", true);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localLogPath = path.join(__dirname, "../local-server.log");
const logStream = fs.createWriteStream(localLogPath, { flags: "a" });
const formatLogPart = (part) => {
  if (part instanceof Error) return part.stack || part.message;
  if (typeof part === "string") return part;
  try {
    return JSON.stringify(part);
  } catch {
    return String(part);
  }
};

function teeConsole(method) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    original(...args);
    logStream.write(`[${new Date().toISOString()}] ${method.toUpperCase()} ${args.map(formatLogPart).join(" ")}\n`);
  };
}

teeConsole("log");
teeConsole("error");

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(
  cors({
    ...corsOptions,
  })
);

function configureApp(targetApp, { adminOnly = false } = {}) {
  targetApp.use(cors(corsOptions));
  targetApp.use(express.json({ limit: "80mb" }));
  targetApp.use(cookieParser());
  targetApp.use("/media", express.static(getMediaDirectory()));
  targetApp.get("/uploads/:filename", serveUploadByFilename);
  targetApp.use("/uploads", express.static(getUploadDirectory()));

  targetApp.use((req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", () => {
      if (env.LOG_HTTP) {
        console.log(
          `[LOCAL ${adminOnly ? "ADMIN" : "HTTP"}] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${
            Date.now() - startedAt
          }ms`
        );
      }
    });

    next();
  });

  targetApp.use(healthRoutes);
  targetApp.use("/api", localRateLimit({ max: env.RATE_LIMIT_MAX, windowMs: env.RATE_LIMIT_WINDOW_MS }));
  targetApp.use("/api/auth", authRoutes);
  targetApp.use("/api/users", userRoutes);
  targetApp.use("/api/chat", chatRoutes);
  targetApp.use("/api/posts", postRoutes);
  targetApp.use("/api/mod", modRoutes);
  targetApp.use("/api/feed", feedRoutes);
  targetApp.use("/api/algorithm", algorithmRoutes);
  targetApp.use("/api/hashtags", hashtagRoutes);
  targetApp.use("/api/interests", interestRoutes);
  targetApp.use("/api/uploads", uploadRoutes);
  targetApp.use("/api/calls", callRoutes);
  targetApp.use("/api/bot", botRoutes);
  targetApp.use("/api/music", musicRoutes);
  targetApp.use("/api/language-groups", languageGroupRoutes);
}

configureApp(app);
configureApp(adminApp, { adminOnly: true });

const frontendDistPath = path.join(__dirname, "../../frontend/dist");

app.get("/", (req, res, next) => {
  if (req.accepts(["html", "json"]) === "json") return rootHealth(req, res);
  return next();
});

app.use(express.static(frontendDistPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

adminApp.use(express.static(frontendDistPath));

adminApp.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

configureSignaling(server, { isAllowedOrigin });
configureSignaling(adminServer, { isAllowedOrigin });

async function start() {
  const warnings = validateEnv();
  warnings.forEach((warning) => console.log(`[LOCAL CONFIG] ${warning}`));
  await ensureUploadDirectory();
  const dbStatus = await connectDatabase();
  const redisStatus = await connectRedis();
  await initLocalStore();
  setBotRuntimeDataProvider(getBotRuntimeSnapshot);
  startBotEngine();

  console.log(`[LOCAL DATA] ${dbStatus.message}`);
  console.log(`[LOCAL REDIS] ${redisStatus.message}`);
  console.log(`[LOCAL MODERATION] Sightengine ${getSightengineStatus().configured ? "configured" : "optional/local fallback"}`);
  console.log(`[LOCAL WORKERS] ${getWorkerStatus().targetWorkers} target worker(s), queue backend: ${getWorkerStatus().queueBackend}`);
  console.log(dbStatus.driver === "mongo" ? "MongoDB store is ready" : "Local JSON store is ready on this PC");

  server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });

  adminServer.listen(ADMIN_PORT, HOST, () => {
    console.log(`Admin panel is running on http://${HOST}:${ADMIN_PORT}/admin`);
  });
}

async function shutdown(signal) {
  console.log(`[LOCAL SERVER] ${signal} received, shutting down cleanly.`);
  await Promise.allSettled([
    new Promise((resolve) => server.close(resolve)),
    new Promise((resolve) => adminServer.close(resolve)),
    closeRedis(),
    closeDatabase(),
  ]);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("[LOCAL SERVER] Startup failed:", error);
  process.exit(1);
});
