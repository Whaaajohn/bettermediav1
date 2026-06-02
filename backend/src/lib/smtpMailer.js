import net from "node:net";
import tls from "node:tls";

const appName =
  process.env.SMTP_APP_NAME ||
  process.env.MAIL_FROM_NAME ||
  process.env.SMTP_FROM_NAME ||
  "Better Media";

const mailEvents = [];

function recordMailEvent(event) {
  mailEvents.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...event,
  });

  mailEvents.splice(50);
}

export function getMailEvents() {
  return mailEvents;
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function smtpConfig() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: booleanValue(process.env.SMTP_SECURE, false),
    user,
    pass,
    fromEmail: (
      process.env.MAIL_FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      process.env.SMTP_USER ||
      ""
    ).trim(),
    fromName:
      process.env.MAIL_FROM_NAME ||
      process.env.SMTP_FROM_NAME ||
      appName,
    timeoutMs: Number(process.env.SMTP_TIMEOUT_MS || 15000),
  };
}

export function getSmtpStatus() {
  const config = smtpConfig();
  const lastEvent = mailEvents[0] || null;
  const enabled = booleanValue(process.env.SMTP_ENABLED ?? process.env.EMAIL_ENABLED, Boolean(config.user && config.pass));

  return {
    enabled,
    configured: Boolean(
      config.host &&
        config.user &&
        config.pass &&
        config.fromEmail
    ),
    healthy: Boolean(
      config.host &&
        config.user &&
        config.pass &&
        config.fromEmail &&
        (!lastEvent || lastEvent.sent || Date.now() - new Date(lastEvent.createdAt).getTime() > 5 * 60 * 1000)
    ),
    host: config.host,
    port: config.port,
    secure: config.secure,
    timeoutMs: config.timeoutMs,
    fromEmail: config.fromEmail,
    lastEvent: lastEvent
      ? {
          sent: lastEvent.sent,
          subject: lastEvent.subject,
          reason: lastEvent.sent ? "" : lastEvent.reason || "SMTP failed",
          createdAt: lastEvent.createdAt,
        }
      : null,
  };
}

const escapeHeader = (value = "") =>
  String(value).replace(/[\r\n]+/g, " ").trim();

const formatAddress = (name, email) => {
  const safeName = escapeHeader(name);

  return safeName ? `"${safeName.replace(/"/g, '\\"')}" <${email}>` : email;
};

const htmlEscape = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const escapes = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return escapes[char] || char;
  });

function errorMessage(error) {
  if (!error) return "Unknown SMTP error";

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors
      .map((item) => item.message || item.code || String(item))
      .filter(Boolean)
      .join("; ");
  }

  return (
    error.message ||
    error.code ||
    error.reason ||
    String(error) ||
    "Unknown SMTP error"
  );
}

function makePreheader(text = "") {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${htmlEscape(text)}
    </div>
  `;
}

function makeEmailShell({
  title,
  preview,
  badge,
  accent = "#7c3aed",
  children,
  footerText,
}) {
  const safeTitle = htmlEscape(title);
  const safePreview = htmlEscape(preview);
  const safeBadge = htmlEscape(badge || appName);
  const safeFooterText = htmlEscape(
    footerText ||
      "You are receiving this email because an account action was requested."
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${safeTitle}</title>
  </head>

  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
    ${makePreheader(preview)}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f7;padding:34px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;">
            <tr>
              <td style="padding:0 4px 14px;text-align:center;">
                <div style="display:inline-block;border:1px solid #e5e7eb;background:#ffffff;border-radius:999px;padding:8px 13px;color:#4b5563;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
                  ${htmlEscape(appName)}
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:30px;overflow:hidden;box-shadow:0 24px 80px rgba(17,24,39,.11);">
                <div style="background:linear-gradient(135deg,${accent},#111827);padding:32px 30px 30px;color:#ffffff;">
                  <div style="display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">
                    ${safeBadge}
                  </div>

                  <h1 style="margin:16px 0 0;font-size:32px;line-height:1.12;font-weight:850;letter-spacing:-.035em;">
                    ${safeTitle}
                  </h1>

                  <p style="margin:12px 0 0;color:rgba(255,255,255,.83);font-size:15px;line-height:1.65;">
                    ${safePreview}
                  </p>
                </div>

                <div style="padding:30px;">
                  ${children}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 8px 0;text-align:center;">
                <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.7;">
                  ${safeFooterText}
                </p>

                <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;line-height:1.7;">
                  ${htmlEscape(appName)} • Account safety and notifications
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function makeSecurityEmail({ title, preview, name, code, purpose }) {
  const safeName = htmlEscape(name || "there");
  const safeCode = htmlEscape(code);
  const safePurpose = htmlEscape(purpose);

  return makeEmailShell({
    title,
    preview,
    badge: "Secure code",
    accent: "#7c3aed",
    footerText:
      "If you did not request this code, you can ignore this email. Never share security codes with anyone.",
    children: `
      <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#111827;">
        Hello <strong>${safeName}</strong>,
      </p>

      <p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#374151;">
        Use the secure code below to ${safePurpose}. This code expires in <strong>10 minutes</strong>.
      </p>

      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:24px;padding:22px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">
          Verification code
        </p>

        <div style="display:inline-block;background:#ffffff;border:1px solid #ddd6fe;border-radius:20px;padding:18px 24px;box-shadow:0 14px 35px rgba(124,58,237,.10);">
          <span style="font-size:40px;letter-spacing:.28em;font-weight:900;color:#6d28d9;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
            ${safeCode}
          </span>
        </div>
      </div>

      <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:20px;padding:16px;margin:22px 0 0;">
        <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
          <strong>Safety reminder:</strong> ${htmlEscape(appName)} staff will never ask you to send this code in chat, messages, comments, calls, or DMs.
        </p>
      </div>

      <div style="margin-top:22px;border-top:1px solid #e5e7eb;padding-top:18px;">
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
          This email was sent to protect your account. The code only works for the request you started.
        </p>
      </div>
    `,
  });
}

function makeTextEmail({ title, name, code, purpose }) {
  return `${title}

Hello ${name || "there"},

Use this secure code to ${purpose}: ${code}

This code expires in 10 minutes.

Safety reminder: ${appName} staff will never ask you to send this code in chat, messages, comments, calls, or DMs.

If you did not request this email, you can safely ignore it.`;
}

function makeStaffHtmlEmail({ title, name, message, staffName }) {
  const safeTitle = htmlEscape(title || "Message from moderation");
  const safeName = htmlEscape(name || "there");
  const safeMessage = htmlEscape(message || "").replace(/\n/g, "<br>");
  const safeStaffName = htmlEscape(staffName || `${appName} staff`);

  return makeEmailShell({
    title: safeTitle,
    preview: "You received a staff message about your account.",
    badge: "Staff message",
    accent: "#111827",
    footerText:
      "You can also review staff messages inside your in-app notifications.",
    children: `
      <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#111827;">
        Hello <strong>${safeName}</strong>,
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:22px;padding:18px;margin:18px 0 0;">
        <p style="margin:0;color:#111827;font-size:16px;line-height:1.7;">
          ${safeMessage || "No message provided."}
        </p>
      </div>

      <div style="margin-top:20px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:20px;padding:15px;">
        <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">
          Sent by <strong>${safeStaffName}</strong>. You can review this message inside your in-app notifications too.
        </p>
      </div>

      <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:18px;">
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
          If you think this message was sent by mistake, contact staff through the app instead of replying with private information.
        </p>
      </div>
    `,
  });
}

function makeStaffTextEmail({ title, name, message, staffName }) {
  return `${title || "Message from moderation"}

Hello ${name || "there"},

${message || ""}

Sent by ${staffName || `${appName} staff`}. You can also review this message in your in-app notifications.`;
}

function makeLoginAlertRows({ device, ipAddress, location, time, locationDetails = {} }) {
  const rows = [
    ["Time", time],
    ["Device", device?.deviceName || device?.browser || "Unknown device"],
    ["Browser", device?.browser || "Unknown browser"],
    ["OS", device?.os || "Unknown OS"],
    ["IP address", ipAddress || "Unknown"],
    ["Location", location || "Unknown location"],
  ];

  if (locationDetails.city) rows.push(["City", locationDetails.city]);
  if (locationDetails.region) rows.push(["Region", locationDetails.region]);
  if (locationDetails.country) rows.push(["Country", locationDetails.country]);
  if (locationDetails.timezone) rows.push(["Timezone", locationDetails.timezone]);
  return rows;
}

function makeLoginAlertHtmlEmail({ name, device, ipAddress, location, locationDetails, time, securityUrl }) {
  const rows = makeLoginAlertRows({ device, ipAddress, location, locationDetails, time });

  return makeEmailShell({
    title: "New login to your account",
    preview: `A new device signed in to your ${appName} account.`,
    badge: "Security alert",
    accent: "#2563eb",
    footerText:
      "If this was you, no action is needed. If not, reset your password and log out other devices.",
    children: `
      <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#111827;">
        Hello <strong>${htmlEscape(name || "there")}</strong>,
      </p>

      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#374151;">
        A device just signed in to your ${htmlEscape(appName)} account.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:12px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;font-weight:700;width:34%;">
                  ${htmlEscape(label)}
                </td>
                <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;">
                  ${htmlEscape(value || "Unknown")}
                </td>
              </tr>
            `
          )
          .join("")}
      </table>

      <div style="margin-top:22px;border:1px solid #dbeafe;background:#eff6ff;border-radius:20px;padding:16px;">
        <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.6;">
          If this was not you, reset your password and log out other devices from Settings > Security.
        </p>
      </div>

      ${
        securityUrl
          ? `<p style="margin:20px 0 0;"><a href="${htmlEscape(securityUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:800;font-size:14px;">Review security settings</a></p>`
          : ""
      }
    `,
  });
}

function makeLoginAlertTextEmail({ name, device, ipAddress, location, locationDetails = {}, time, securityUrl }) {
  const extraLocationLines = [
    locationDetails.city && `City: ${locationDetails.city}`,
    locationDetails.region && `Region: ${locationDetails.region}`,
    locationDetails.country && `Country: ${locationDetails.country}`,
    locationDetails.timezone && `Timezone: ${locationDetails.timezone}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `New login to your ${appName} account

Hello ${name || "there"},

A device just signed in to your ${appName} account.

Time: ${time || "Unknown"}
Device: ${device?.deviceName || device?.browser || "Unknown device"}
Browser: ${device?.browser || "Unknown browser"}
OS: ${device?.os || "Unknown OS"}
IP address: ${ipAddress || "Unknown"}
Location: ${location || "Unknown location"}
${extraLocationLines ? `${extraLocationLines}\n` : ""}

If this was you, no action is needed.
If this was not you, reset your password and log out other devices.${securityUrl ? `\n\nSecurity settings: ${securityUrl}` : ""}`;
}

function readResponse(socket, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP server did not respond before the timeout."));
    }, timeoutMs);

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");

      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";

      if (/^\d{3}\s/.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
  });
}

async function sendCommand(socket, command, expectedCodes, timeoutMs) {
  socket.write(`${command}\r\n`);

  const response = await readResponse(socket, timeoutMs);
  const code = Number(response.slice(0, 3));

  if (!expectedCodes.includes(code)) {
    throw new Error(
      `SMTP command failed (${command.split(" ")[0]}): ${response.trim()}`
    );
  }

  return response;
}

function dotStuff(message) {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

async function sendMail({ to, subject, text, html }) {
  const config = smtpConfig();

  if (!getSmtpStatus().configured) {
    recordMailEvent({
      to,
      subject,
      sent: false,
      reason: "SMTP is not configured",
    });

    return {
      sent: false,
      reason: "SMTP is not configured",
    };
  }

  let socket = config.secure
    ? tls.connect({
        host: config.host,
        port: config.port,
        servername: config.host,
      })
    : net.connect({
        host: config.host,
        port: config.port,
      });

  socket.setTimeout(config.timeoutMs);

  await new Promise((resolve, reject) => {
    socket.once(config.secure ? "secureConnect" : "connect", resolve);
    socket.once("error", reject);
    socket.once("timeout", () =>
      reject(new Error("SMTP connection timed out."))
    );
  });

  try {
    await readResponse(socket, config.timeoutMs);
    await sendCommand(socket, "EHLO localhost", [250], config.timeoutMs);

    if (!config.secure) {
      await sendCommand(socket, "STARTTLS", [220], config.timeoutMs);

      socket = tls.connect({
        socket,
        servername: config.host,
      });

      socket.setTimeout(config.timeoutMs);

      await new Promise((resolve, reject) => {
        socket.once("secureConnect", resolve);
        socket.once("error", reject);
        socket.once("timeout", () =>
          reject(new Error("SMTP TLS upgrade timed out."))
        );
      });

      await sendCommand(socket, "EHLO localhost", [250], config.timeoutMs);
    }

    await sendCommand(
      socket,
      `AUTH PLAIN ${Buffer.from(
        `\u0000${config.user}\u0000${config.pass}`
      ).toString("base64")}`,
      [235],
      config.timeoutMs
    );

    await sendCommand(
      socket,
      `MAIL FROM:<${config.fromEmail}>`,
      [250],
      config.timeoutMs
    );

    await sendCommand(socket, `RCPT TO:<${to}>`, [250, 251], config.timeoutMs);
    await sendCommand(socket, "DATA", [354], config.timeoutMs);

    const boundary = `bm-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    const message = [
      `From: ${formatAddress(config.fromName, config.fromEmail)}`,
      `To: ${to}`,
      `Subject: ${escapeHeader(subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      text,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");

    socket.write(`${dotStuff(message)}\r\n.\r\n`);

    const response = await readResponse(socket, config.timeoutMs);

    if (!response.startsWith("250")) {
      throw new Error(`SMTP DATA failed: ${response.trim()}`);
    }

    await sendCommand(socket, "QUIT", [221], config.timeoutMs);

    recordMailEvent({
      to,
      subject,
      sent: true,
    });

    return {
      sent: true,
    };
  } catch (error) {
    const reason = errorMessage(error);

    recordMailEvent({
      to,
      subject,
      sent: false,
      reason,
    });

    throw new Error(reason);
  } finally {
    socket.end();
  }
}

async function sendCodeMail({ to, name, code, kind }) {
  const isReset = kind === "reset";

  const subject = isReset
    ? `${appName} password reset code`
    : `${appName} email verification code`;

  const purpose = isReset
    ? "reset your password"
    : "verify your email and unlock posting, messaging, calls, follows, and reports";

  const title = isReset ? "Reset your password" : "Verify your email";

  const preview = isReset
    ? "Use this secure code to reset your password."
    : `Use this secure code to verify your ${appName} account.`;

  return sendMail({
    to,
    subject,
    text: makeTextEmail({
      title,
      name,
      code,
      purpose,
    }),
    html: makeSecurityEmail({
      title,
      preview,
      name,
      code,
      purpose,
    }),
  });
}

export const sendVerificationEmail = ({ to, name, code }) =>
  sendCodeMail({
    to,
    name,
    code,
    kind: "verify",
  });

export const sendPasswordResetEmail = ({ to, name, code }) =>
  sendCodeMail({
    to,
    name,
    code,
    kind: "reset",
  });

export const sendLoginCodeEmail = ({ to, name, code }) =>
  sendMail({
    to,
    subject: `${appName} login code`,
    text: makeTextEmail({
      title: "Confirm your login",
      name,
      code,
      purpose: "finish signing in to your account",
    }),
    html: makeSecurityEmail({
      title: "Confirm your login",
      preview: "Use this secure code to finish signing in.",
      name,
      code,
      purpose: "finish signing in to your account",
    }),
  });

export async function sendLoginAlertEmail({
  to,
  name,
  device,
  ipAddress,
  location,
  locationDetails,
  time,
  securityUrl,
}) {
  return sendMail({
    to,
    subject: `${appName} security alert: new login`,
    text: makeLoginAlertTextEmail({
      name,
      device,
      ipAddress,
      location,
      locationDetails,
      time,
      securityUrl,
    }),
    html: makeLoginAlertHtmlEmail({
      name,
      device,
      ipAddress,
      location,
      locationDetails,
      time,
      securityUrl,
    }),
  });
}

export async function sendStaffEmail({ to, name, title, message, staffName }) {
  const cleanTitle = title || "Moderation update";
  const subject = `${appName} staff message: ${cleanTitle}`.slice(0, 120);

  return sendMail({
    to,
    subject,
    text: makeStaffTextEmail({
      title: cleanTitle,
      name,
      message,
      staffName,
    }),
    html: makeStaffHtmlEmail({
      title: cleanTitle,
      name,
      message,
      staffName,
    }),
  });
}
