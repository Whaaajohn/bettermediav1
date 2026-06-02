const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");

const MASK_VALUE = "************";
const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL || "";

const FIELD_DEFS = {
  RUN_MODE: { type: "enum", values: ["local", "production"], default: "local" },
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  LOCAL_DEV: { type: "boolean", default: true },
  HOST: { type: "string", default: "127.0.0.1" },
  PORT: { type: "number", default: 5174 },
  ADMIN_PORT: { type: "number", default: 5175 },
  CLIENT_URL: { type: "string", default: "" },
  API_BASE_URL: { type: "string", default: "" },
  CORS_ORIGINS: { type: "string", default: "" },
  TRUST_PROXY: { type: "boolean", default: false },
  JWT_SECRET: { type: "string", default: "", secret: true },
  JWT_EXPIRES_IN: { type: "string", default: "7d" },
  COOKIE_NAME: { type: "string", default: "jwt" },
  COOKIE_SECURE: { type: "boolean", default: false },
  COOKIE_SAME_SITE: { type: "enum", values: ["lax", "strict", "none"], default: "lax" },
  BCRYPT_ROUNDS: { type: "number", default: 10 },
  ADMIN_USERNAME: { type: "string", default: "admin" },
  ADMIN_EMAIL: { type: "string", default: "admin@bettermedia.local" },
  ADMIN_PASSWORD: { type: "string", default: "", secret: true },
  BOT_USERNAME: { type: "string", default: "mediabot" },
  BOT_EMAIL: { type: "string", default: "bot@bettermedia.local" },
  BOT_PASSWORD: { type: "string", default: "", secret: true },
  DB_DRIVER: { type: "enum", values: ["local", "mongo"], default: "local" },
  MONGO_URI: { type: "string", default: "", secret: true },
  AUTO_BACKUP_DB: { type: "boolean", default: true },
  LOCAL_DATA_DIR: { type: "string", default: "" },
  LOCAL_DB_FILE: { type: "string", default: "" },
  BACKUP_DIR: { type: "string", default: "" },
  MAX_BACKUPS: { type: "number", default: 15 },
  REDIS_ENABLED: { type: "boolean", default: false },
  REDIS_URL: { type: "string", default: "", secret: true },
  REDIS_PREFIX: { type: "string", default: "bettermedia:" },
  USE_REDIS_SOCKET_ADAPTER: { type: "boolean", default: false },
  EMAIL_ENABLED: { type: "boolean", default: false },
  SMTP_HOST: { type: "string", default: "" },
  SMTP_PORT: { type: "number", default: 587 },
  SMTP_SECURE: { type: "boolean", default: false },
  SMTP_USER: { type: "string", default: "" },
  SMTP_PASS: { type: "string", default: "", secret: true },
  MAIL_FROM_NAME: { type: "string", default: "Better Media" },
  MAIL_FROM_EMAIL: { type: "string", default: "no-reply@bettermedia.local" },
  DEV_PRINT_EMAIL_CODES: { type: "boolean", default: true },
  UPLOAD_DRIVER: { type: "enum", values: ["local", "s3", "r2"], default: "local" },
  LOCAL_UPLOAD_DIR: { type: "string", default: "" },
  PUBLIC_UPLOAD_URL: { type: "string", default: "" },
  S3_ENABLED: { type: "boolean", default: false },
  S3_ENDPOINT: { type: "string", default: "" },
  S3_REGION: { type: "string", default: "" },
  S3_BUCKET: { type: "string", default: "" },
  S3_ACCESS_KEY_ID: { type: "string", default: "", secret: true },
  S3_SECRET_ACCESS_KEY: { type: "string", default: "", secret: true },
  S3_PUBLIC_URL: { type: "string", default: "" },
  CLOUDFLARE_R2_ENABLED: { type: "boolean", default: false },
  R2_ACCOUNT_ID: { type: "string", default: "", secret: true },
  R2_ACCESS_KEY_ID: { type: "string", default: "", secret: true },
  R2_SECRET_ACCESS_KEY: { type: "string", default: "", secret: true },
  R2_BUCKET: { type: "string", default: "" },
  R2_PUBLIC_URL: { type: "string", default: "" },
  BOT_ENGINE_ENABLED: { type: "boolean", default: true },
  BOT_LOCAL_AI_ENABLED: { type: "boolean", default: true },
  BOT_SCAN_POSTS: { type: "boolean", default: true },
  BOT_SCAN_COMMENTS: { type: "boolean", default: true },
  BOT_SCAN_MESSAGES: { type: "boolean", default: true },
  BOT_SCAN_IMAGES: { type: "boolean", default: false },
  BOT_CAN_WARN: { type: "boolean", default: true },
  BOT_CAN_HIDE_CONTENT: { type: "boolean", default: false },
  BOT_CAN_TEMP_MUTE: { type: "boolean", default: false },
  BOT_CAN_TEMP_RESTRICT: { type: "boolean", default: false },
  BOT_CAN_FULL_BAN: { type: "boolean", default: false },
  BOT_TEXT_MODEL: { type: "string", default: "local-fallback" },
  BOT_IMAGE_MODEL: { type: "string", default: "" },
  BOT_MODEL_CACHE_DIR: { type: "string", default: "" },
  BOT_AI_CONCURRENCY: { type: "number", default: 1 },
  RATE_LIMIT_ENABLED: { type: "boolean", default: true },
  RATE_LIMIT_WINDOW_MS: { type: "number", default: 60000 },
  RATE_LIMIT_MAX: { type: "number", default: 120 },
  AUTH_RATE_LIMIT_MAX: { type: "number", default: 20 },
  POST_RATE_LIMIT_MAX: { type: "number", default: 30 },
  MESSAGE_RATE_LIMIT_MAX: { type: "number", default: 80 },
  UPLOAD_RATE_LIMIT_MAX: { type: "number", default: 20 },
  ALGORITHM_ENABLED: { type: "boolean", default: true },
  FEED_CACHE_SECONDS: { type: "number", default: 60 },
  TRENDING_CACHE_SECONDS: { type: "number", default: 120 },
  MAX_CANDIDATE_POSTS: { type: "number", default: 500 },
  DEFAULT_FEED_LIMIT: { type: "number", default: 20 },
  EXPLORATION_PERCENT: { type: "number", default: 10 },
  FOLLOWING_PERCENT: { type: "number", default: 35 },
  LANGUAGE_PERCENT: { type: "number", default: 25 },
  TRENDING_PERCENT: { type: "number", default: 10 },
  NEW_USER_PERCENT: { type: "number", default: 10 },
  STAFF_PERCENT: { type: "number", default: 5 },
  SOCKET_IO_ENABLED: { type: "boolean", default: true },
  CALL_SIGNALING_ENABLED: { type: "boolean", default: true },
  STUN_URLS: { type: "string", default: "stun:stun.l.google.com:19302" },
  TURN_ENABLED: { type: "boolean", default: false },
  TURN_URL: { type: "string", default: "" },
  TURN_USERNAME: { type: "string", default: "" },
  TURN_PASSWORD: { type: "string", default: "", secret: true },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn", "error"], default: "info" },
  LOG_HTTP: { type: "boolean", default: true },
  LOG_SOCKET: { type: "boolean", default: true },
  LOG_BOT: { type: "boolean", default: true },
  LOG_TO_FILE: { type: "boolean", default: true },
  START_SERVER_ON_OPEN: { type: "boolean", default: false },
  KEEP_SERVER_RUNNING_ON_CLOSE: { type: "boolean", default: false },
  MINIMIZE_TO_TRAY: { type: "boolean", default: false },
  LAUNCHER_THEME: { type: "enum", values: ["dark", "system"], default: "dark" },
  REDUCED_MOTION: { type: "boolean", default: false },
  COMPACT_MODE: { type: "boolean", default: false }
};

const SECRET_KEYS = Object.entries(FIELD_DEFS)
  .filter(([, def]) => def.secret)
  .map(([key]) => key);

let mainWindow = null;
let serverProcess = null;
let stoppingServer = false;
let quitting = false;
let cachedSettings = null;
let firstRun = false;
const logEntries = [];
const MAX_LOG_ENTRIES = 1200;

let serverState = {
  status: "stopped",
  pid: null,
  startedAt: null,
  lastError: null,
  exitCode: null
};

function userDataPath(...parts) {
  return path.join(app.getPath("userData"), ...parts);
}

function settingsPath() {
  return userDataPath("settings.json");
}

function logsDir() {
  return userDataPath("logs");
}

function backendLogPath() {
  return path.join(logsDir(), "backend.log");
}

function serverDataDir() {
  return userDataPath("server-data");
}

function localDbFile() {
  return path.join(serverDataDir(), "db.json");
}

function uploadDir() {
  return path.join(serverDataDir(), "uploads");
}

function backupDir() {
  return path.join(serverDataDir(), "backups");
}

function modelCacheDir() {
  return path.join(serverDataDir(), "models");
}

function strongSecret() {
  return crypto.randomBytes(48).toString("base64url");
}

function shortSecret() {
  return crypto.randomBytes(14).toString("base64url");
}

function defaultValueForKey(key, def) {
  if (key === "JWT_SECRET") return strongSecret();
  if (key === "ADMIN_PASSWORD" || key === "BOT_PASSWORD") return shortSecret();
  if (key === "LOCAL_DATA_DIR") return serverDataDir();
  if (key === "LOCAL_DB_FILE") return localDbFile();
  if (key === "LOCAL_UPLOAD_DIR") return uploadDir();
  if (key === "BACKUP_DIR") return backupDir();
  if (key === "BOT_MODEL_CACHE_DIR") return modelCacheDir();
  return def.default;
}

function defaultSettings() {
  const values = {};
  Object.entries(FIELD_DEFS).forEach(([key, def]) => {
    values[key] = defaultValueForKey(key, def);
  });
  return values;
}

async function ensureUserDataDirs() {
  await Promise.all([
    fsp.mkdir(logsDir(), { recursive: true }),
    fsp.mkdir(serverDataDir(), { recursive: true }),
    fsp.mkdir(uploadDir(), { recursive: true }),
    fsp.mkdir(backupDir(), { recursive: true }),
    fsp.mkdir(modelCacheDir(), { recursive: true })
  ]);
}

function coerceField(key, value, existingValue) {
  const def = FIELD_DEFS[key];
  if (!def) return undefined;

  if (def.secret && value === MASK_VALUE) {
    return existingValue || "";
  }

  if (def.type === "boolean") {
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    return Boolean(value);
  }
  if (def.type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : def.default;
  }
  if (def.type === "enum") {
    const text = String(value ?? def.default);
    return def.values.includes(text) ? text : def.default;
  }
  return String(value ?? "").trim();
}

function sanitizeSettings(input = {}, existing = {}) {
  const result = {};
  Object.entries(FIELD_DEFS).forEach(([key, def]) => {
    const fallback = existing[key] ?? defaultValueForKey(key, def);
    const value = Object.prototype.hasOwnProperty.call(input, key) ? input[key] : fallback;
    result[key] = coerceField(key, value, fallback);
  });
  if (!result.JWT_SECRET) result.JWT_SECRET = strongSecret();
  if (!result.ADMIN_PASSWORD) result.ADMIN_PASSWORD = shortSecret();
  if (!result.BOT_PASSWORD) result.BOT_PASSWORD = shortSecret();
  return result;
}

function validateSettings(settings) {
  const errors = [];
  const warnings = [];
  const port = Number(settings.PORT);
  const adminPort = Number(settings.ADMIN_PORT);

  if (!settings.HOST) errors.push("HOST is required.");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) errors.push("PORT must be between 1024 and 65535.");
  if (!Number.isInteger(adminPort) || adminPort < 1024 || adminPort > 65535) errors.push("ADMIN_PORT must be between 1024 and 65535.");
  if (port === adminPort) errors.push("PORT and ADMIN_PORT must be different.");
  if (settings.DB_DRIVER === "mongo" && !settings.MONGO_URI) errors.push("MONGO_URI is required when DB_DRIVER=mongo.");
  if (settings.NODE_ENV === "production" && settings.JWT_SECRET.includes("change-this")) errors.push("JWT_SECRET must be changed for production.");
  if (settings.NODE_ENV === "production" && settings.JWT_SECRET.length < 48) warnings.push("Use a longer JWT secret for production.");
  if (settings.SMTP_SECURE && Number(settings.SMTP_PORT) === 587) warnings.push("SMTP_SECURE is usually false on port 587 and true on port 465.");
  if (settings.REDIS_ENABLED && !settings.REDIS_URL) warnings.push("Redis is enabled but REDIS_URL is empty. The backend may fall back locally.");
  if (settings.EMAIL_ENABLED && (!settings.SMTP_HOST || !settings.SMTP_USER || !settings.SMTP_PASS)) {
    warnings.push("Email is enabled but SMTP settings are incomplete.");
  }
  if (!settings.ADMIN_USERNAME || settings.ADMIN_USERNAME.length < 3) errors.push("ADMIN_USERNAME must be at least 3 characters.");
  if (settings.ADMIN_PASSWORD && settings.ADMIN_PASSWORD.length < 8) warnings.push("ADMIN_PASSWORD should be at least 8 characters.");
  if (settings.BOT_PASSWORD && settings.BOT_PASSWORD.length < 8) warnings.push("BOT_PASSWORD should be at least 8 characters.");
  if (settings.TURN_ENABLED && (!settings.TURN_URL || !settings.TURN_USERNAME || !settings.TURN_PASSWORD)) {
    warnings.push("TURN is enabled but TURN credentials are incomplete.");
  }
  if (settings.NODE_ENV === "production" && settings.LOCAL_DEV) warnings.push("LOCAL_DEV should usually be false in production.");
  if (settings.JWT_SECRET.length < 32) errors.push("JWT_SECRET must be at least 32 characters.");

  return { ok: errors.length === 0, errors, warnings };
}

function maskSettings(settings) {
  const result = { ...settings };
  SECRET_KEYS.forEach((key) => {
    result[key] = settings[key] ? MASK_VALUE : "";
  });
  return result;
}

function publicSettingsPayload(settings = cachedSettings) {
  return {
    settings: maskSettings(settings || defaultSettings()),
    secretKeys: SECRET_KEYS,
    maskValue: MASK_VALUE,
    firstRun,
    settingsPath: settingsPath()
  };
}

async function loadSettings() {
  await ensureUserDataDirs();
  try {
    const raw = await fsp.readFile(settingsPath(), "utf8");
    cachedSettings = sanitizeSettings(JSON.parse(raw));
    firstRun = false;
  } catch {
    cachedSettings = defaultSettings();
    firstRun = true;
    await saveSettings(cachedSettings);
  }
  return cachedSettings;
}

async function saveSettings(settings) {
  await ensureUserDataDirs();
  cachedSettings = sanitizeSettings(settings, cachedSettings || {});
  await fsp.writeFile(settingsPath(), JSON.stringify(cachedSettings, null, 2));
  return cachedSettings;
}

function getDisplayHost(settings = cachedSettings) {
  if (!settings) return "localhost";
  return ["0.0.0.0", "::"].includes(settings.HOST) ? "localhost" : settings.HOST;
}

function getUrls(settings = cachedSettings) {
  const host = getDisplayHost(settings);
  return {
    appUrl: `http://${host}:${settings.PORT}`,
    adminUrl: `http://${host}:${settings.ADMIN_PORT}/admin`
  };
}

function appRootDir() {
  return app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
}

function backendDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "backend") : path.resolve(__dirname, "..", "backend");
}

function backendEntry() {
  return path.join(backendDir(), "src", "server.js");
}

function rendererIndex() {
  return path.join(__dirname, "renderer", "dist", "index.html");
}

function buildBackendEnv(settings) {
  const urls = getUrls(settings);
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1"
  };

  Object.keys(FIELD_DEFS).forEach((key) => {
    env[key] = String(settings[key] ?? "");
  });

  env.API_BASE_URL = settings.API_BASE_URL || urls.appUrl;
  env.CLIENT_URL = settings.CLIENT_URL || urls.appUrl;
  env.CORS_ORIGINS = settings.CORS_ORIGINS || `${urls.appUrl},${urls.adminUrl}`;
  env.LOCAL_DATA_DIR = settings.LOCAL_DATA_DIR || serverDataDir();
  env.LOCAL_DB_FILE = settings.LOCAL_DB_FILE || localDbFile();
  env.DB_BACKUP_DIR = settings.BACKUP_DIR || backupDir();
  env.BACKUP_DIR = settings.BACKUP_DIR || backupDir();
  env.LOCAL_UPLOAD_DIR = settings.LOCAL_UPLOAD_DIR || uploadDir();
  env.PUBLIC_UPLOAD_URL = settings.PUBLIC_UPLOAD_URL || `${urls.appUrl}/uploads`;
  env.BOT_MODEL_CACHE_DIR = settings.BOT_MODEL_CACHE_DIR || modelCacheDir();

  return env;
}

function maskText(text = "") {
  let output = String(text);
  const settings = cachedSettings || {};

  SECRET_KEYS.forEach((key) => {
    const value = settings[key];
    if (typeof value === "string" && value.length >= 4) {
      output = output.split(value).join(MASK_VALUE);
    }
    output = output.replace(new RegExp(`(${key}\\s*[=:]\\s*)\\S+`, "gi"), `$1${MASK_VALUE}`);
  });

  return output;
}

async function writeLogLine(entry) {
  await ensureUserDataDirs();
  const line = `[${entry.time}] ${entry.level.toUpperCase()} ${entry.message}\n`;
  await fsp.appendFile(backendLogPath(), line).catch(() => {});
}

function pushLog(level, message) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: new Date().toISOString(),
    level,
    message: maskText(message)
  };

  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) logEntries.shift();
  writeLogLine(entry);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("logs:entry", entry);
  }
}

function setServerState(nextState) {
  serverState = { ...serverState, ...nextState };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("server:status", getServerStatus());
  }
}

function getServerStatus() {
  return {
    ...serverState,
    running: Boolean(serverProcess && !serverProcess.killed),
    urls: cachedSettings ? getUrls(cachedSettings) : null,
    settingsSummary: cachedSettings
      ? {
          host: cachedSettings.HOST,
          port: cachedSettings.PORT,
          adminPort: cachedSettings.ADMIN_PORT,
          nodeEnv: cachedSettings.NODE_ENV,
          localDev: cachedSettings.LOCAL_DEV,
          dbDriver: cachedSettings.DB_DRIVER,
          botStatus: cachedSettings.BOT_ENGINE_ENABLED ? "enabled" : "disabled"
        }
      : null
  };
}

async function requestJson(url, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        } catch {
          resolve({ ok: false, statusCode: res.statusCode, body });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Request timed out."));
    });
  });
}

async function pollHealthUntilOnline() {
  if (!cachedSettings) return;
  const { appUrl } = getUrls(cachedSettings);
  const deadline = Date.now() + 20000;

  while (serverProcess && Date.now() < deadline) {
    try {
      const result = await requestJson(`${appUrl}/api/health`, 1500);
      if (result.ok) {
        setServerState({ status: "online", lastError: null });
        return;
      }
    } catch {
      // Keep waiting while the backend boots.
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  if (serverProcess && serverState.status === "starting") {
    setServerState({ status: "error", lastError: "Backend did not become healthy in time." });
  }
}

async function startServer() {
  const settings = await loadSettings();
  const validation = validateSettings(settings);
  if (!validation.ok) {
    const message = validation.errors.join(" ");
    setServerState({ status: "error", lastError: message });
    throw new Error(message);
  }

  if (serverProcess && !serverProcess.killed) {
    return getServerStatus();
  }

  if (!fs.existsSync(backendEntry())) {
    const message = `Backend entry not found: ${backendEntry()}`;
    setServerState({ status: "error", lastError: message });
    throw new Error(message);
  }

  stoppingServer = false;
  setServerState({
    status: "starting",
    pid: null,
    startedAt: new Date().toISOString(),
    exitCode: null,
    lastError: null
  });

  pushLog("info", "Starting BetterMedia backend...");

  serverProcess = spawn(process.execPath, [backendEntry()], {
    cwd: backendDir(),
    env: buildBackendEnv(settings),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  setServerState({ pid: serverProcess.pid });

  serverProcess.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    pushLog("info", text.trimEnd());
    if (/Server is running/i.test(text)) setServerState({ status: "online", lastError: null });
  });

  serverProcess.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    pushLog("error", text.trimEnd());
  });

  serverProcess.on("error", (error) => {
    pushLog("error", error.message);
    setServerState({ status: "error", lastError: error.message, pid: null });
  });

  serverProcess.on("exit", (code, signal) => {
    const wasStopping = stoppingServer;
    const message = `Backend exited with code ${code ?? "none"}${signal ? ` and signal ${signal}` : ""}.`;
    pushLog(wasStopping ? "info" : "error", message);
    serverProcess = null;
    stoppingServer = false;
    setServerState({
      status: wasStopping ? "stopped" : "error",
      pid: null,
      exitCode: code,
      lastError: wasStopping ? null : message
    });
  });

  pollHealthUntilOnline();
  return getServerStatus();
}

function forceKillProcess(pid) {
  return new Promise((resolve) => {
    if (!pid) return resolve();
    if (process.platform !== "win32") {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already gone.
      }
      resolve();
      return;
    }

    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
    killer.on("exit", () => resolve());
    killer.on("error", () => resolve());
  });
}

async function stopServer() {
  if (!serverProcess) {
    setServerState({ status: "stopped", pid: null, lastError: null });
    return getServerStatus();
  }

  const processToStop = serverProcess;
  const pid = processToStop.pid;
  stoppingServer = true;
  setServerState({ status: "stopped", lastError: null });
  pushLog("info", "Stopping BetterMedia backend...");

  processToStop.kill("SIGTERM");

  await new Promise((resolve) => {
    const timer = setTimeout(async () => {
      await forceKillProcess(pid);
      resolve();
    }, 5000);

    processToStop.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  return getServerStatus();
}

async function restartServer() {
  await stopServer();
  return startServer();
}

function isTrustedSender(event) {
  const url = event.senderFrame?.url || "";
  return url.startsWith("file://") || url.startsWith("http://127.0.0.1:5180") || url.startsWith("http://localhost:5180");
}

function handle(channel, handler) {
  ipcMain.handle(channel, async (event, payload) => {
    if (!isTrustedSender(event)) throw new Error("Blocked untrusted IPC sender.");
    return handler(payload, event);
  });
}

function validatePayloadObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid payload.");
  }
}

async function isPortAvailable(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(Number(port), host || "127.0.0.1");
  });
}

async function getDiagnostics() {
  const settings = await loadSettings();
  const ports = {
    app: await isPortAvailable(settings.HOST, settings.PORT),
    admin: await isPortAvailable(settings.HOST, settings.ADMIN_PORT)
  };

  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    appRoot: appRootDir(),
    backendDir: backendDir(),
    settingsPath: settingsPath(),
    logPath: backendLogPath(),
    dbPath: localDbFile(),
    mediaDirectory: uploadDir(),
    backendPid: serverState.pid,
    status: getServerStatus(),
    ports
  };
}

async function runHealthCheck() {
  const settings = await loadSettings();
  const urls = getUrls(settings);
  const endpoints = ["/api/health", "/api/version", "/api/ready"];
  const results = [];

  for (const endpoint of endpoints) {
    try {
      const result = await requestJson(`${urls.appUrl}${endpoint}`);
      results.push({ endpoint, ...result });
    } catch (error) {
      results.push({ endpoint, ok: false, statusCode: 0, error: error.message });
    }
  }

  return results;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 680,
    title: "BetterMedia Launcher",
    icon: path.join(__dirname, "resources", "icon.ico"),
    backgroundColor: "#030712",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedDevUrl = RENDERER_DEV_URL && url.startsWith(RENDERER_DEV_URL);
    const allowedFileUrl = url.startsWith("file://") && url.includes("/renderer/dist/index.html");
    if (!allowedDevUrl && !allowedFileUrl) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (RENDERER_DEV_URL) {
    mainWindow.loadURL(RENDERER_DEV_URL);
  } else {
    mainWindow.loadFile(rendererIndex());
  }
}

function registerIpc() {
  handle("app:get-initial-state", async () => {
    const settings = await loadSettings();
    return {
      settings: publicSettingsPayload(settings),
      status: getServerStatus(),
      diagnostics: await getDiagnostics(),
      logs: logEntries
    };
  });

  handle("settings:get", async () => publicSettingsPayload(await loadSettings()));

  handle("settings:reveal", async (payload) => {
    validatePayloadObject(payload);
    if (!SECRET_KEYS.includes(payload.key)) throw new Error("Field is not revealable.");
    const settings = await loadSettings();
    return { key: payload.key, value: settings[payload.key] || "" };
  });

  handle("settings:save", async (payload) => {
    validatePayloadObject(payload);
    const settings = sanitizeSettings(payload, await loadSettings());
    const validation = validateSettings(settings);
    if (!validation.ok) throw new Error(validation.errors.join(" "));
    firstRun = false;
    await saveSettings(settings);
    return { ...publicSettingsPayload(settings), validation };
  });

  handle("settings:reset", async () => {
    const settings = defaultSettings();
    await saveSettings(settings);
    firstRun = true;
    return publicSettingsPayload(settings);
  });

  handle("settings:validate", async (payload) => {
    validatePayloadObject(payload);
    const settings = sanitizeSettings(payload, await loadSettings());
    return validateSettings(settings);
  });

  handle("settings:generate-secret", async (payload) => {
    validatePayloadObject(payload);
    if (!SECRET_KEYS.includes(payload.key)) throw new Error("Field cannot be generated.");
    return {
      key: payload.key,
      value: payload.key === "JWT_SECRET" ? strongSecret() : shortSecret()
    };
  });

  handle("server:start", startServer);
  handle("server:stop", stopServer);
  handle("server:restart", restartServer);
  handle("server:status", async () => getServerStatus());

  handle("app:open-main", async () => {
    const { appUrl } = getUrls(await loadSettings());
    await shell.openExternal(appUrl);
    return true;
  });

  handle("app:open-admin", async () => {
    const { adminUrl } = getUrls(await loadSettings());
    await shell.openExternal(adminUrl);
    return true;
  });

  handle("app:open-folder", async (payload) => {
    validatePayloadObject(payload);
    const settings = await loadSettings();
    const folders = {
      data: settings.LOCAL_DATA_DIR || serverDataDir(),
      media: settings.LOCAL_UPLOAD_DIR || uploadDir(),
      logs: logsDir(),
      backups: settings.BACKUP_DIR || backupDir(),
      install: appRootDir(),
      project: appRootDir()
    };
    const folder = folders[payload.folder];
    if (!folder) throw new Error("Folder is not available.");
    await fsp.mkdir(folder, { recursive: true }).catch(() => {});
    await shell.openPath(folder);
    return true;
  });

  handle("logs:get", async () => logEntries);

  handle("logs:clear", async () => {
    try {
      logEntries.splice(0, logEntries.length);
      await ensureUserDataDirs();
      await fsp.writeFile(backendLogPath(), "");
      return true;
    } catch (error) {
      pushLog("error", `Could not clear logs: ${error.message}`);
      throw error;
    }
  });

  handle("logs:export", async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export BetterMedia backend logs",
      defaultPath: `bettermedia-backend-${new Date().toISOString().slice(0, 10)}.log`,
      filters: [{ name: "Log files", extensions: ["log", "txt"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const text = logEntries.map((entry) => `[${entry.time}] ${entry.level.toUpperCase()} ${entry.message}`).join("\n");
    await fsp.writeFile(result.filePath, text);
    return { canceled: false, filePath: result.filePath };
  });

  handle("diagnostics:get", getDiagnostics);
  handle("diagnostics:health", runHealthCheck);
}

app.whenReady().then(async () => {
  const settings = await loadSettings();
  registerIpc();
  createWindow();
  if (settings.START_SERVER_ON_OPEN) {
    startServer().catch((error) => pushLog("error", `Auto-start failed: ${error.message}`));
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", (event) => {
  if (quitting) return;
  if (serverProcess && !(cachedSettings && cachedSettings.KEEP_SERVER_RUNNING_ON_CLOSE)) {
    event.preventDefault();
    quitting = true;
    stopServer().finally(() => app.quit());
  }
});

process.on("uncaughtException", (error) => {
  pushLog("error", `Launcher error: ${error.stack || error.message}`);
  setServerState({ status: serverState.status === "starting" ? "error" : serverState.status, lastError: error.message });
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  pushLog("error", `Launcher async error: ${message}`);
});
