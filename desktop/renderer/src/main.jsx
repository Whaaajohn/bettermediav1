import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const api = window.betterMedia;

const FIELD_GROUPS = [
  {
    title: "Server",
    note: "How BetterMedia runs on this Windows PC.",
    fields: [
      ["RUN_MODE", "Run mode", "select", ["local", "production"]],
      ["NODE_ENV", "Environment", "select", ["development", "production", "test"]],
      ["LOCAL_DEV", "Local dev mode", "boolean"],
      ["HOST", "Host", "text"],
      ["PORT", "App port", "number"],
      ["ADMIN_PORT", "Admin port", "number"],
      ["CLIENT_URL", "Client URL override", "text"],
      ["API_BASE_URL", "API base URL override", "text"],
      ["CORS_ORIGINS", "Allowed origins", "text"],
      ["TRUST_PROXY", "Trust proxy", "boolean"]
    ]
  },
  {
    title: "Security/Auth",
    note: "Account, cookie, admin, and bot login credentials.",
    fields: [
      ["JWT_SECRET", "JWT secret", "secret"],
      ["JWT_EXPIRES_IN", "JWT expires in", "text"],
      ["COOKIE_NAME", "Cookie name", "text"],
      ["COOKIE_SECURE", "Secure cookies", "boolean"],
      ["COOKIE_SAME_SITE", "Cookie same-site", "select", ["lax", "strict", "none"]],
      ["BCRYPT_ROUNDS", "Password hash rounds", "number"],
      ["ADMIN_USERNAME", "Admin username", "text"],
      ["ADMIN_EMAIL", "Admin email", "text"],
      ["ADMIN_PASSWORD", "Admin password", "secret"],
      ["BOT_USERNAME", "Bot username", "text"],
      ["BOT_EMAIL", "Bot email", "text"],
      ["BOT_PASSWORD", "Bot password", "secret"]
    ]
  },
  {
    title: "Database",
    note: "Local-first storage by default, MongoDB when you want production mode.",
    fields: [
      ["DB_DRIVER", "Database mode", "select", ["local", "mongo"]],
      ["MONGO_URI", "MongoDB URI", "secret"],
      ["AUTO_BACKUP_DB", "Auto-backup local DB", "boolean"],
      ["LOCAL_DATA_DIR", "Local data folder", "text"],
      ["LOCAL_DB_FILE", "Local DB file", "text"],
      ["BACKUP_DIR", "Backup folder", "text"],
      ["MAX_BACKUPS", "Max backups", "number"]
    ]
  },
  {
    title: "Redis",
    note: "Optional for production scale, safe to leave off locally.",
    fields: [
      ["REDIS_ENABLED", "Enable Redis", "boolean"],
      ["REDIS_URL", "Redis URL", "secret"],
      ["REDIS_PREFIX", "Redis key prefix", "text"],
      ["USE_REDIS_SOCKET_ADAPTER", "Redis Socket.IO adapter", "boolean"]
    ]
  },
  {
    title: "Email/SMTP",
    note: "Optional. If off locally, verification codes print to terminal/logs.",
    fields: [
      ["EMAIL_ENABLED", "Enable email", "boolean"],
      ["SMTP_HOST", "SMTP host", "text"],
      ["SMTP_PORT", "SMTP port", "number"],
      ["SMTP_SECURE", "SMTP secure", "boolean"],
      ["SMTP_USER", "SMTP user", "text"],
      ["SMTP_PASS", "SMTP password", "secret"],
      ["MAIL_FROM_NAME", "Mail from name", "text"],
      ["MAIL_FROM_EMAIL", "Mail from email", "text"],
      ["DEV_PRINT_EMAIL_CODES", "Print dev email codes", "boolean"]
    ]
  },
  {
    title: "Uploads/Storage",
    note: "Local uploads by default. S3/R2 are only needed for production hosting.",
    fields: [
      ["UPLOAD_DRIVER", "Upload driver", "select", ["local", "s3", "r2"]],
      ["LOCAL_UPLOAD_DIR", "Local uploads folder", "text"],
      ["PUBLIC_UPLOAD_URL", "Public upload URL", "text"],
      ["S3_ENABLED", "Enable S3", "boolean"],
      ["S3_ENDPOINT", "S3 endpoint", "text"],
      ["S3_REGION", "S3 region", "text"],
      ["S3_BUCKET", "S3 bucket", "text"],
      ["S3_ACCESS_KEY_ID", "S3 access key", "secret"],
      ["S3_SECRET_ACCESS_KEY", "S3 secret key", "secret"],
      ["S3_PUBLIC_URL", "S3 public URL", "text"],
      ["CLOUDFLARE_R2_ENABLED", "Enable Cloudflare R2", "boolean"],
      ["R2_ACCOUNT_ID", "R2 account ID", "secret"],
      ["R2_ACCESS_KEY_ID", "R2 access key", "secret"],
      ["R2_SECRET_ACCESS_KEY", "R2 secret key", "secret"],
      ["R2_BUCKET", "R2 bucket", "text"],
      ["R2_PUBLIC_URL", "R2 public URL", "text"]
    ]
  },
  {
    title: "Moderation/Bot",
    note: "Bot powers stay limited. Full bans are not enabled for the bot.",
    fields: [
      ["BOT_ENGINE_ENABLED", "Enable bot engine", "boolean"],
      ["BOT_LOCAL_AI_ENABLED", "Enable local AI", "boolean"],
      ["BOT_SCAN_POSTS", "Scan posts", "boolean"],
      ["BOT_SCAN_COMMENTS", "Scan comments", "boolean"],
      ["BOT_SCAN_MESSAGES", "Scan messages", "boolean"],
      ["BOT_SCAN_IMAGES", "Scan images", "boolean"],
      ["BOT_CAN_WARN", "Bot can warn", "boolean"],
      ["BOT_CAN_HIDE_CONTENT", "Bot can hide content", "boolean"],
      ["BOT_CAN_TEMP_MUTE", "Bot can temp mute", "boolean"],
      ["BOT_CAN_TEMP_RESTRICT", "Bot can temp restrict", "boolean"],
      ["BOT_CAN_FULL_BAN", "Bot can full ban", "boolean"],
      ["BOT_TEXT_MODEL", "Bot text model", "text"],
      ["BOT_IMAGE_MODEL", "Bot image model", "text"],
      ["BOT_MODEL_CACHE_DIR", "Bot model cache folder", "text"],
      ["BOT_AI_CONCURRENCY", "Bot AI concurrency", "number"]
    ]
  },
  {
    title: "Rate Limits",
    note: "Per-user limits that protect the app without logging everybody out.",
    fields: [
      ["RATE_LIMIT_ENABLED", "Enable rate limits", "boolean"],
      ["RATE_LIMIT_WINDOW_MS", "Rate window ms", "number"],
      ["RATE_LIMIT_MAX", "Default max", "number"],
      ["AUTH_RATE_LIMIT_MAX", "Auth max", "number"],
      ["POST_RATE_LIMIT_MAX", "Post max", "number"],
      ["MESSAGE_RATE_LIMIT_MAX", "Message max", "number"],
      ["UPLOAD_RATE_LIMIT_MAX", "Upload max", "number"]
    ]
  },
  {
    title: "Algorithm/Feed",
    note: "Feed blend controls for local testing and production tuning.",
    fields: [
      ["ALGORITHM_ENABLED", "Enable algorithm", "boolean"],
      ["FEED_CACHE_SECONDS", "Feed cache seconds", "number"],
      ["TRENDING_CACHE_SECONDS", "Trending cache seconds", "number"],
      ["MAX_CANDIDATE_POSTS", "Max candidate posts", "number"],
      ["DEFAULT_FEED_LIMIT", "Default feed limit", "number"],
      ["EXPLORATION_PERCENT", "Exploration %", "number"],
      ["FOLLOWING_PERCENT", "Following %", "number"],
      ["LANGUAGE_PERCENT", "Language %", "number"],
      ["TRENDING_PERCENT", "Trending %", "number"],
      ["NEW_USER_PERCENT", "New user %", "number"],
      ["STAFF_PERCENT", "Staff %", "number"]
    ]
  },
  {
    title: "Calls/Socket",
    note: "WebRTC signaling settings. TURN helps calls through tunnels and strict networks.",
    fields: [
      ["SOCKET_IO_ENABLED", "Enable Socket.IO", "boolean"],
      ["CALL_SIGNALING_ENABLED", "Enable call signaling", "boolean"],
      ["STUN_URLS", "STUN URLs", "text"],
      ["TURN_ENABLED", "Enable TURN", "boolean"],
      ["TURN_URL", "TURN URL", "text"],
      ["TURN_USERNAME", "TURN username", "text"],
      ["TURN_PASSWORD", "TURN password", "secret"]
    ]
  },
  {
    title: "Logs/Launcher",
    note: "Desktop app behavior and logging.",
    fields: [
      ["LOG_LEVEL", "Log level", "select", ["debug", "info", "warn", "error"]],
      ["LOG_HTTP", "Log HTTP", "boolean"],
      ["LOG_SOCKET", "Log socket", "boolean"],
      ["LOG_BOT", "Log bot", "boolean"],
      ["LOG_TO_FILE", "Log to file", "boolean"],
      ["START_SERVER_ON_OPEN", "Start server when launcher opens", "boolean"],
      ["KEEP_SERVER_RUNNING_ON_CLOSE", "Keep server running when launcher closes", "boolean"],
      ["MINIMIZE_TO_TRAY", "Minimize to tray", "boolean"],
      ["LAUNCHER_THEME", "Launcher theme", "select", ["dark", "system"]],
      ["COMPACT_MODE", "Compact mode", "boolean"],
      ["REDUCED_MOTION", "Reduced motion", "boolean"]
    ]
  }
];

const WIZARD_STEPS = [
  "Welcome",
  "Server",
  "Admin",
  "Database",
  "SMTP",
  "Bot",
  "Launch"
];

const TOUR_CARDS = [
  {
    title: "Dashboard",
    text: "Start, stop, restart, and open BetterMedia or the admin panel without touching a terminal.",
    tone: "blue"
  },
  {
    title: "Settings",
    text: "Edit ports, local mode, database, SMTP, bot, and secret values from a safe masked settings screen.",
    tone: "violet"
  },
  {
    title: "Logs",
    text: "Watch the backend output live, filter noisy lines, clear the view, and export logs when debugging.",
    tone: "cyan"
  },
  {
    title: "Diagnostics",
    text: "Check ports, paths, health endpoints, backend PID, and the local folders BetterMedia is using.",
    tone: "indigo"
  }
];

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function statusLabel(status) {
  const value = status?.status || "stopped";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusTone(status) {
  const value = status?.status || "stopped";
  if (value === "online") return "online";
  if (value === "starting") return "starting";
  if (value === "error") return "error";
  return "stopped";
}

function formatBoolean(value) {
  return value ? "Enabled" : "Disabled";
}

function Notice({ notice, onClose }) {
  if (!notice) return null;
  return (
    <div className={classNames("notice", notice.type || "info")}>
      <span>{notice.message}</span>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
}

function Shell({ activePage, setActivePage, firstRun, status, children }) {
  const nav = [
    ["dashboard", "Dashboard"],
    ["guide", "Guide"],
    ["settings", "Settings"],
    ["logs", "Logs"],
    ["diagnostics", "Diagnostics"]
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="./icon.svg" alt="" />
          </div>
          <div>
            <h1>BetterMedia</h1>
            <p>Desktop Launcher</p>
          </div>
        </div>

        <nav className="nav-list">
          {nav.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={classNames(activePage === id && "active")}
              onClick={() => setActivePage(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className={classNames("status-dot", statusTone(status))} />
          <div>
            <strong>{statusLabel(status)}</strong>
            <p>{status?.pid ? `PID ${status.pid}` : "No backend process"}</p>
          </div>
        </div>

        {firstRun && (
          <div className="first-run-note">
            First run tour is ready. Walk through the launcher, save settings, and start the server.
          </div>
        )}
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span className={classNames("pill", statusTone(status))}>
      <span className={classNames("status-dot", statusTone(status))} />
      {statusLabel(status)}
    </span>
  );
}

function Dashboard({ settings, status, onStart, onStop, onRestart, onOpenMain, onOpenAdmin, onOpenFolder, onGoSettings, onGoLogs, busy }) {
  const summary = status?.settingsSummary || {};
  const urls = status?.urls || {};

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Control panel</p>
          <h2>BetterMedia server</h2>
          <p>Run the local app without VS Code or terminal windows.</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="hero-panel">
        <div>
          <h3>{statusLabel(status)}</h3>
          <p>{status?.lastError || "Backend process manager is ready."}</p>
        </div>
        <div className="button-row">
          <button type="button" className="primary" onClick={onStart} disabled={busy || status?.running}>
            Start Server
          </button>
          <button type="button" onClick={onStop} disabled={busy || !status?.running}>
            Stop Server
          </button>
          <button type="button" onClick={onRestart} disabled={busy}>
            Restart Server
          </button>
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <h3>Open app</h3>
          <div className="url-box">{urls.appUrl || `http://localhost:${settings.PORT}`}</div>
          <button type="button" className="wide" onClick={onOpenMain}>Open BetterMedia</button>
        </div>

        <div className="panel">
          <h3>Admin panel</h3>
          <div className="url-box">{urls.adminUrl || `http://localhost:${settings.ADMIN_PORT}/admin`}</div>
          <button type="button" className="wide" onClick={onOpenAdmin}>Open Admin Panel</button>
        </div>
      </div>

      <div className="grid four">
        <Metric label="Host" value={summary.host || settings.HOST} />
        <Metric label="Port" value={summary.port || settings.PORT} />
        <Metric label="Database" value={summary.dbDriver || settings.DB_DRIVER} />
        <Metric label="Bot" value={summary.botStatus || formatBoolean(settings.BOT_ENGINE_ENABLED)} />
      </div>

      <div className="panel action-panel">
        <h3>Quick actions</h3>
        <div className="button-row left">
          <button type="button" onClick={() => onOpenFolder("data")}>Open data folder</button>
          <button type="button" onClick={() => onOpenFolder("media")}>Open media folder</button>
          <button type="button" onClick={() => onOpenFolder("logs")}>Open logs folder</button>
          <button type="button" onClick={onGoLogs}>View logs</button>
          <button type="button" onClick={onGoSettings}>Open settings</button>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{String(value ?? "Unknown")}</strong>
    </div>
  );
}

function Field({ field, settings, setSettings, secretKeys, revealed, onReveal, onGenerate, onCopy }) {
  const [key, label, type, options] = field;
  const isSecret = secretKeys.includes(key) || type === "secret";
  const value = settings[key] ?? "";

  if (type === "boolean") {
    return (
      <label className="toggle-field">
        <span>
          <strong>{label}</strong>
          <small>{key}</small>
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))}
        />
      </label>
    );
  }

  if (type === "select") {
    return (
      <label className="field">
        <span>{label}</span>
        <select
          value={value}
          onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))}
        >
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="secret-row">
        <input
          type={isSecret && !revealed[key] ? "password" : type === "number" ? "number" : "text"}
          value={value}
          onChange={(event) => {
            const nextValue = type === "number" ? Number(event.target.value) : event.target.value;
            setSettings((current) => ({ ...current, [key]: nextValue }));
          }}
          spellCheck="false"
        />
        {isSecret && (
          <>
            <button type="button" className="ghost small" onClick={() => onReveal(key)}>
              {revealed[key] ? "Hide" : "Reveal"}
            </button>
            <button type="button" className="ghost small" onClick={() => onGenerate(key)}>
              Generate
            </button>
          </>
        )}
        {!isSecret && (
          <button type="button" className="ghost small" onClick={() => onCopy(key, value)}>
            Copy
          </button>
        )}
      </div>
      <small>{key}</small>
    </label>
  );
}

function SettingsPage({
  settings,
  setSettings,
  secretKeys,
  revealed,
  onReveal,
  onSave,
  onReset,
  onValidate,
  onGenerate,
  onCopy,
  validation,
  busy
}) {
  const [activeGroup, setActiveGroup] = useState(FIELD_GROUPS[0].title);
  const visibleGroups = FIELD_GROUPS.filter((group) => group.title === activeGroup);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Settings</h2>
          <p>These values are saved in Electron userData, not frontend source files.</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={onValidate} disabled={busy}>Validate</button>
          <button type="button" onClick={onReset} disabled={busy}>Reset defaults</button>
          <button type="button" className="primary" onClick={onSave} disabled={busy}>Save</button>
        </div>
      </div>

      {validation && (
        <div className={classNames("validation", validation.ok ? "ok" : "bad")}>
          <strong>{validation.ok ? "Settings look good." : "Settings need attention."}</strong>
          {validation.errors?.map((item) => <p key={item}>{item}</p>)}
          {validation.warnings?.map((item) => <p key={item}>{item}</p>)}
        </div>
      )}

      <div className="settings-tabs">
        {FIELD_GROUPS.map((group) => (
          <button
            type="button"
            key={group.title}
            className={activeGroup === group.title ? "active" : ""}
            onClick={() => setActiveGroup(group.title)}
          >
            {group.title}
          </button>
        ))}
      </div>

      {visibleGroups.map((group) => (
        <div className="panel" key={group.title}>
          <h3>{group.title}</h3>
          {group.note && <p className="panel-note">{group.note}</p>}
          <div className="settings-grid">
            {group.fields.map((field) => (
              <Field
                key={field[0]}
                field={field}
                settings={settings}
                setSettings={setSettings}
                secretKeys={secretKeys}
                revealed={revealed}
                onReveal={onReveal}
                onGenerate={onGenerate}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function LogsPage({ logs, filter, setFilter, onClear, onExport }) {
  const filtered = logs.filter((entry) => filter === "all" || entry.level === filter);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Backend logs</h2>
          <p>Secrets are masked before logs are displayed or exported.</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={onClear}>Clear logs</button>
          <button type="button" className="primary" onClick={onExport}>Export logs</button>
        </div>
      </div>

      <div className="segmented">
        {["all", "info", "warn", "error"].map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="log-box">
        {filtered.length === 0 ? (
          <div className="empty">No logs yet.</div>
        ) : (
          filtered.map((entry) => (
            <div className={classNames("log-line", entry.level)} key={entry.id}>
              <span>{entry.time.slice(11, 19)}</span>
              <b>{entry.level}</b>
              <pre>{entry.message}</pre>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DiagnosticsPage({ diagnostics, healthResults, onRefresh, onHealth }) {
  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Diagnostics</p>
          <h2>System checks</h2>
          <p>Check ports, paths, health endpoints, and runtime versions.</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={onRefresh}>Refresh</button>
          <button type="button" className="primary" onClick={onHealth}>Health check</button>
        </div>
      </div>

      <div className="grid four">
        <Metric label="App version" value={diagnostics?.appVersion} />
        <Metric label="Node" value={diagnostics?.nodeVersion} />
        <Metric label="Electron" value={diagnostics?.electronVersion} />
        <Metric label="Backend PID" value={diagnostics?.backendPid || "Not running"} />
      </div>

      <div className="panel">
        <h3>Ports</h3>
        <div className="diagnostic-row">
          <span>App port</span>
          <strong>{diagnostics?.ports?.app ? "Available" : "In use"}</strong>
        </div>
        <div className="diagnostic-row">
          <span>Admin port</span>
          <strong>{diagnostics?.ports?.admin ? "Available" : "In use"}</strong>
        </div>
      </div>

      <div className="panel path-panel">
        <h3>Paths</h3>
        <p><span>Database</span>{diagnostics?.dbPath}</p>
        <p><span>Media</span>{diagnostics?.mediaDirectory}</p>
        <p><span>Logs</span>{diagnostics?.logPath}</p>
        <p><span>Settings</span>{diagnostics?.settingsPath}</p>
      </div>

      <div className="panel">
        <h3>Health</h3>
        {!healthResults?.length ? (
          <p className="muted">Run a health check to see backend endpoint status.</p>
        ) : (
          healthResults.map((result) => (
            <div className="diagnostic-row" key={result.endpoint}>
              <span>{result.endpoint}</span>
              <strong className={result.ok ? "good" : "bad"}>{result.ok ? "OK" : result.error || result.statusCode}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function LauncherTour({ settings, setSettings, secretKeys, revealed, onReveal, onGenerate, onCopy, onSave, onStart, onOpenMain, onOpenAdmin, firstRun, busy }) {
  const [step, setStep] = useState(0);
  const groupFields = {
    1: ["RUN_MODE", "LOCAL_DEV", "HOST", "PORT", "ADMIN_PORT"],
    2: ["JWT_SECRET", "ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "BOT_USERNAME", "BOT_EMAIL", "BOT_PASSWORD"],
    3: ["DB_DRIVER", "MONGO_URI", "LOCAL_DATA_DIR", "LOCAL_DB_FILE", "BACKUP_DIR", "AUTO_BACKUP_DB"],
    4: ["EMAIL_ENABLED", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM_NAME", "MAIL_FROM_EMAIL"],
    5: ["BOT_ENGINE_ENABLED", "BOT_LOCAL_AI_ENABLED", "BOT_SCAN_POSTS", "BOT_SCAN_COMMENTS", "BOT_SCAN_MESSAGES", "BOT_SCAN_IMAGES"]
  };
  const fieldsByKey = Object.fromEntries(FIELD_GROUPS.flatMap((group) => group.fields).map((field) => [field[0], field]));

  return (
    <section className="wizard tour-screen">
      <div className="wizard-card tour-card">
        <div className="tour-hero">
          <div className="tour-copy">
            <p className="eyebrow">{firstRun ? "First run tour" : "Launcher guide"}</p>
            <h2>Welcome to BetterMedia Launcher</h2>
            <p>
              This desktop control panel runs your local BetterMedia server, keeps the important controls in one place,
              and helps regular Windows users launch the app without VS Code.
            </p>
          </div>
          <div className="tour-orbit" aria-hidden="true">
            <img src="./icon.svg" alt="" />
            <span className="orbit-dot one" />
            <span className="orbit-dot two" />
            <span className="orbit-dot three" />
          </div>
        </div>

        <div className="wizard-steps">
          {WIZARD_STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={classNames(step === index && "active", index < step && "done")}
              onClick={() => setStep(index)}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="tour-layout">
            <div className="tour-map">
              <button
                type="button"
                className={classNames("setup-choice", settings.RUN_MODE === "local" && "selected")}
                onClick={() => setSettings((current) => ({ ...current, RUN_MODE: "local", LOCAL_DEV: true, DB_DRIVER: "local", NODE_ENV: "development" }))}
              >
                <span>Run on this computer</span>
                <strong>Local PC mode</strong>
                <p>Best for now. Uses local JSON data, local uploads, optional SMTP, and no paid API keys.</p>
              </button>
              <button
                type="button"
                className={classNames("setup-choice", settings.RUN_MODE === "production" && "selected")}
                onClick={() => setSettings((current) => ({ ...current, RUN_MODE: "production", LOCAL_DEV: false, DB_DRIVER: "mongo", NODE_ENV: "production" }))}
              >
                <span>Prepare production config</span>
                <strong>MongoDB / hosted mode</strong>
                <p>Use this when you have MongoDB, Redis, SMTP, storage, and real production secrets ready.</p>
              </button>
              {TOUR_CARDS.slice(0, 2).map((card) => (
                <div className={classNames("tour-map-card", card.tone)} key={card.title}>
                  <strong>{card.title}</strong>
                  <p>{card.text}</p>
                </div>
              ))}
            </div>
            <div className="tour-checklist">
              <h3>Before anything else</h3>
              <p>Pick how you want BetterMedia to run. The next screens walk you through ports, JWT, admin login, bot login, database, and SMTP.</p>
              <ul>
                <li>Local PC mode never requires paid external APIs.</li>
                <li>JWT and passwords can be generated from inside the launcher.</li>
                <li>SMTP is optional, but the setup still shows you where it goes.</li>
                <li>Admin panel opens directly from the Dashboard after the server starts.</li>
              </ul>
            </div>
          </div>
        )}

        {step > 0 && step < 6 ? (
          <div className="settings-grid wizard-fields">
            {groupFields[step].map((key) => fieldsByKey[key]).filter(Boolean).map((field) => (
              <Field
                key={field[0]}
                field={field}
                settings={settings}
                setSettings={setSettings}
                secretKeys={secretKeys}
                revealed={revealed}
                onReveal={onReveal}
                onGenerate={onGenerate}
                onCopy={onCopy}
              />
            ))}
          </div>
        ) : null}

        {step === 6 && (
          <div className="ready-box">
            <div>
              <h3>You are ready to run BetterMedia</h3>
              <p>Save these settings, start the server, then open the app. You can come back to the Guide tab anytime.</p>
            </div>
            <div className="launch-summary">
              <Metric label="App URL" value={`http://localhost:${settings.PORT}`} />
              <Metric label="Admin URL" value={`http://localhost:${settings.ADMIN_PORT}/admin`} />
              <Metric label="Database" value={settings.DB_DRIVER} />
            </div>
          </div>
        )}

        <div className="button-row wizard-actions">
          <button type="button" disabled={step === 0 || busy} onClick={() => setStep((value) => value - 1)}>Back</button>
          {step < 6 ? (
            <button type="button" className="primary" disabled={busy} onClick={() => setStep((value) => value + 1)}>Next</button>
          ) : (
            <>
              <button type="button" onClick={onSave} disabled={busy}>Save</button>
              <button type="button" className="primary" onClick={onStart} disabled={busy}>Start server</button>
              <button type="button" onClick={onOpenMain} disabled={busy}>Open app</button>
              <button type="button" onClick={onOpenAdmin} disabled={busy}>Open admin</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [settings, setSettings] = useState(null);
  const [secretKeys, setSecretKeys] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [firstRun, setFirstRun] = useState(false);
  const [status, setStatus] = useState({ status: "stopped" });
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("all");
  const [diagnostics, setDiagnostics] = useState(null);
  const [healthResults, setHealthResults] = useState([]);
  const [validation, setValidation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const showInitialSetup = firstRun;

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      const result = await action();
      if (successMessage) setNotice({ type: "success", message: successMessage });
      return result;
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Action failed." });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const applySettingsPayload = (payload) => {
    setSettings(payload.settings);
    setSecretKeys(payload.secretKeys || []);
    setFirstRun(Boolean(payload.firstRun));
    setRevealed({});
  };

  useEffect(() => {
    let unlistenStatus = () => {};
    let unlistenLogs = () => {};

    api.getInitialState().then((state) => {
      applySettingsPayload(state.settings);
      setStatus(state.status);
      setDiagnostics(state.diagnostics);
      setLogs(state.logs || []);
    }).catch((error) => {
      setNotice({ type: "error", message: error.message || "Could not load launcher state." });
    });

    unlistenStatus = api.events.onServerStatus(setStatus);
    unlistenLogs = api.events.onLogEntry((entry) => {
      setLogs((current) => [...current.slice(-1199), entry]);
    });

    return () => {
      unlistenStatus();
      unlistenLogs();
    };
  }, []);

  const refreshDiagnostics = () => run(async () => {
    const data = await api.diagnostics.get();
    setDiagnostics(data);
    return data;
  });

  const saveSettings = () => run(async () => {
    const payload = await api.settings.save(settings);
    applySettingsPayload(payload);
    setValidation(payload.validation);
    return payload;
  }, "Settings saved.");

  const validateCurrentSettings = () => run(async () => {
    const result = await api.settings.validate(settings);
    setValidation(result);
    return result;
  });

  const resetSettings = () => run(async () => {
    const payload = await api.settings.reset();
    applySettingsPayload(payload);
    setValidation(null);
    return payload;
  }, "Defaults restored.");

  const revealSecret = (key) => run(async () => {
    if (revealed[key]) {
      setSettings((current) => ({ ...current, [key]: current[key] ? "************" : "" }));
      setRevealed((current) => ({ ...current, [key]: false }));
      return null;
    }
    const result = await api.settings.reveal(key);
    setSettings((current) => ({ ...current, [key]: result.value }));
    setRevealed((current) => ({ ...current, [key]: true }));
    return result;
  });

  const generateSecret = (key) => run(async () => {
    const result = await api.settings.generateSecret(key);
    setSettings((current) => ({ ...current, [key]: result.value }));
    setRevealed((current) => ({ ...current, [key]: true }));
    return result;
  }, `${key} generated.`);

  const copyField = (key, value) => run(async () => {
    await navigator.clipboard.writeText(String(value ?? ""));
    return true;
  }, `${key} copied.`);

  const startServer = () => run(async () => {
    await api.settings.save(settings);
    const next = await api.server.start();
    setStatus(next);
    setFirstRun(false);
    return next;
  }, "Server start requested.");

  const stopServer = () => run(async () => {
    const next = await api.server.stop();
    setStatus(next);
    return next;
  }, "Server stopped.");

  const restartServer = () => run(async () => {
    await api.settings.save(settings);
    const next = await api.server.restart();
    setStatus(next);
    return next;
  }, "Server restarted.");

  const openMain = () => run(() => api.app.openMain());
  const openAdmin = () => run(() => api.app.openAdmin());
  const openFolder = (folder) => run(() => api.app.openFolder(folder));
  const clearLogs = () => run(async () => {
    await api.logs.clear();
    setLogs([]);
  }, "Logs cleared.");
  const exportLogs = () => run(async () => {
    const result = await api.logs.export();
    if (result && !result.canceled) setNotice({ type: "success", message: `Logs exported to ${result.filePath}` });
  });
  const healthCheck = () => run(async () => {
    const result = await api.diagnostics.health();
    setHealthResults(result);
    return result;
  });

  const page = useMemo(() => {
    if (!settings) return <div className="loading">Loading launcher...</div>;
    if (activePage === "guide") {
      return (
        <LauncherTour
          settings={settings}
          setSettings={setSettings}
          secretKeys={secretKeys}
          revealed={revealed}
          onReveal={revealSecret}
          onGenerate={generateSecret}
          onCopy={copyField}
          onSave={saveSettings}
          onStart={startServer}
          onOpenMain={openMain}
          onOpenAdmin={openAdmin}
          firstRun={firstRun}
          busy={busy}
        />
      );
    }
    if (activePage === "settings") {
      return (
        <SettingsPage
          settings={settings}
          setSettings={setSettings}
          secretKeys={secretKeys}
          revealed={revealed}
          onReveal={revealSecret}
          onGenerate={generateSecret}
          onCopy={copyField}
          onSave={saveSettings}
          onReset={resetSettings}
          onValidate={validateCurrentSettings}
          validation={validation}
          busy={busy}
        />
      );
    }
    if (activePage === "logs") {
      return (
        <LogsPage
          logs={logs}
          filter={logFilter}
          setFilter={setLogFilter}
          onClear={clearLogs}
          onExport={exportLogs}
        />
      );
    }
    if (activePage === "diagnostics") {
      return (
        <DiagnosticsPage
          diagnostics={diagnostics}
          healthResults={healthResults}
          onRefresh={refreshDiagnostics}
          onHealth={healthCheck}
        />
      );
    }
    return (
      <Dashboard
        settings={settings}
        status={status}
        onStart={startServer}
        onStop={stopServer}
        onRestart={restartServer}
        onOpenMain={openMain}
        onOpenAdmin={openAdmin}
        onOpenFolder={openFolder}
        onGoSettings={() => setActivePage("settings")}
        onGoLogs={() => setActivePage("logs")}
        busy={busy}
      />
    );
  }, [activePage, busy, diagnostics, firstRun, healthResults, logFilter, logs, revealed, secretKeys, settings, status, validation]);

  if (!settings) {
    return <div className="loading full-page">Loading launcher...</div>;
  }

  if (showInitialSetup) {
    return (
      <div className="setup-shell">
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <LauncherTour
          settings={settings}
          setSettings={setSettings}
          secretKeys={secretKeys}
          revealed={revealed}
          onReveal={revealSecret}
          onGenerate={generateSecret}
          onCopy={copyField}
          onSave={saveSettings}
          onStart={startServer}
          onOpenMain={openMain}
          onOpenAdmin={openAdmin}
          firstRun={firstRun}
          busy={busy}
        />
      </div>
    );
  }

  return (
    <Shell activePage={activePage} setActivePage={setActivePage} firstRun={firstRun} status={status}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {page}
    </Shell>
  );
}

function MissingBridge() {
  return (
    <main className="bridge-missing">
      <div>
        <img src="./icon.svg" alt="" />
        <p className="eyebrow">Electron bridge unavailable</p>
        <h1>Open BetterMedia Launcher with Electron</h1>
        <p>This control panel needs the secure desktop preload bridge to start servers and manage settings.</p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(api ? <App /> : <MissingBridge />);
