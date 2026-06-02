import jwt from "jsonwebtoken";
import {
  createSessionFor,
  createUser,
  findUserByLogin,
  getSessionsForUser,
  makeLocalAvatar,
  publicUser,
  revokeAllSessionsFor,
  revokeOtherSessionsFor,
  revokeSessionFor,
  resetPasswordFor,
  setSessionTrustFor,
  startEmailVerificationFor,
  startLoginChallengeFor,
  startPasswordResetFor,
  updateUser,
  verifyEmailCodeFor,
  verifyLoginChallengeFor,
  verifyPassword,
} from "../lib/localStore.js";
import {
  sendLoginAlertEmail,
  sendLoginCodeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../lib/smtpMailer.js";
import { env } from "../config/env.js";

const JWT_SECRET = env.JWT_SECRET;

const authCookieOptions = {
  httpOnly: true,
  sameSite: env.COOKIE_SAME_SITE,
  secure: env.COOKIE_SECURE,
};

function setAuthCookie(res, userId, sessionId = null) {
  const token = jwt.sign({ userId, sessionId }, JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  res.cookie(env.COOKIE_NAME, token, {
    ...authCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function sendError(res, error, fallback = "Internal server error") {
  res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || "ERROR",
  });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "local";
}

function decodeHeaderValue(value) {
  if (Array.isArray(value)) return decodeHeaderValue(value[0]);
  if (!value) return "";

  try {
    return decodeURIComponent(String(value).replace(/\+/g, " ")).trim();
  } catch {
    return String(value).trim();
  }
}

function isLocalIp(ipAddress = "") {
  return (
    ipAddress === "local" ||
    ipAddress === "::1" ||
    ipAddress === "127.0.0.1" ||
    ipAddress.startsWith("::ffff:127.") ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.")
  );
}

const COUNTRY_NAMES = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AR: "Argentina",
  AU: "Australia",
  AT: "Austria",
  BS: "Bahamas",
  BB: "Barbados",
  BE: "Belgium",
  BO: "Bolivia",
  BR: "Brazil",
  CA: "Canada",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  FR: "France",
  DE: "Germany",
  GH: "Ghana",
  GT: "Guatemala",
  HT: "Haiti",
  HN: "Honduras",
  IN: "India",
  IE: "Ireland",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  KR: "South Korea",
  MX: "Mexico",
  NL: "Netherlands",
  NI: "Nicaragua",
  NG: "Nigeria",
  PA: "Panama",
  PE: "Peru",
  PT: "Portugal",
  PR: "Puerto Rico",
  ES: "Spain",
  TT: "Trinidad and Tobago",
  GB: "United Kingdom",
  UK: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  VE: "Venezuela",
};

const TIMEZONE_COUNTRY_HINTS = {
  "America/Adak": "US",
  "America/Anchorage": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Detroit": "US",
  "America/Indiana/Indianapolis": "US",
  "America/Los_Angeles": "US",
  "America/New_York": "US",
  "America/Phoenix": "US",
  "America/Puerto_Rico": "PR",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Mexico_City": "MX",
  "America/Santo_Domingo": "DO",
  "America/Port-au-Prince": "HT",
  "America/Jamaica": "JM",
  "America/La_Paz": "BO",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Sao_Paulo": "BR",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Kolkata": "IN",
};

const TIMEZONE_REGION_HINTS = {
  "America/Adak": "Hawaii-Aleutian Time",
  "America/Anchorage": "Alaska Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Detroit": "Eastern Time",
  "America/Indiana/Indianapolis": "Eastern Time",
  "America/Los_Angeles": "Pacific Time",
  "America/New_York": "Eastern Time",
  "America/Phoenix": "Mountain Time",
  "America/Toronto": "Eastern Time",
  "America/Vancouver": "Pacific Time",
};

function normalizeCountryCode(value = "") {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}

function countryNameFromCode(value = "") {
  const code = normalizeCountryCode(value);
  return code ? COUNTRY_NAMES[code] || code : "";
}

function countryCodeFromLocale(locale = "") {
  const match = String(locale || "").match(/[-_]([A-Za-z]{2})(?:$|[-_])/);
  return normalizeCountryCode(match?.[1] || "");
}

function countryCodeFromTimezone(timezone = "") {
  const value = String(timezone || "").trim();
  return normalizeCountryCode(TIMEZONE_COUNTRY_HINTS[value] || "");
}

function regionFromTimezone(timezone = "") {
  return TIMEZONE_REGION_HINTS[String(timezone || "").trim()] || "";
}

function clientHintsFromRequest(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const languages = Array.isArray(body.clientLanguages)
    ? body.clientLanguages
    : typeof body.clientLanguages === "string"
      ? body.clientLanguages.split(",")
      : [];
  const acceptLanguage = decodeHeaderValue(req.headers?.["accept-language"])
    .split(",")
    .map((value) => value.split(";")[0]?.trim())
    .filter(Boolean);

  return {
    timezone: textValue(body.clientTimezone || body.timezone || body.clientTimeZone, 80),
    locale: textValue(body.clientLocale || body.locale || acceptLanguage[0] || "", 40),
    languages: [...languages, ...acceptLanguage]
      .map((value) => textValue(value, 40))
      .filter(Boolean)
      .slice(0, 10),
  };
}

function textValue(value = "", max = 120) {
  return String(value || "").trim().slice(0, max);
}

function locationDetailsFromRequest(req, ipAddress) {
  const headers = req.headers || {};
  const hints = clientHintsFromRequest(req);
  const headerCountryCode =
    normalizeCountryCode(headers["cf-ipcountry"]) ||
    normalizeCountryCode(headers["x-vercel-ip-country"]) ||
    normalizeCountryCode(headers["x-appengine-country"]) ||
    normalizeCountryCode(headers["x-forwarded-country"]);
  const localeCountryCode =
    countryCodeFromLocale(hints.locale) ||
    hints.languages.map(countryCodeFromLocale).find(Boolean) ||
    "";
  const timezoneCountryCode = countryCodeFromTimezone(hints.timezone);
  const bestCountryCode = headerCountryCode || localeCountryCode || timezoneCountryCode;
  const details = {
    city:
      decodeHeaderValue(headers["cf-ipcity"]) ||
      decodeHeaderValue(headers["x-vercel-ip-city"]) ||
      decodeHeaderValue(headers["x-appengine-city"]) ||
      decodeHeaderValue(headers["x-forwarded-city"]),
    region:
      decodeHeaderValue(headers["cf-region"]) ||
      decodeHeaderValue(headers["cf-region-code"]) ||
      decodeHeaderValue(headers["x-vercel-ip-country-region"]) ||
      decodeHeaderValue(headers["x-appengine-region"]) ||
      decodeHeaderValue(headers["x-forwarded-region"]) ||
      regionFromTimezone(hints.timezone),
    country:
      countryNameFromCode(headerCountryCode) ||
      decodeHeaderValue(headers["x-forwarded-country"]) ||
      countryNameFromCode(bestCountryCode),
    countryCode: bestCountryCode,
    latitude:
      decodeHeaderValue(headers["x-vercel-ip-latitude"]) ||
      decodeHeaderValue(headers["x-forwarded-latitude"]),
    longitude:
      decodeHeaderValue(headers["x-vercel-ip-longitude"]) ||
      decodeHeaderValue(headers["x-forwarded-longitude"]),
    timezone:
      decodeHeaderValue(headers["cf-timezone"]) ||
      decodeHeaderValue(headers["x-vercel-ip-timezone"]) ||
      decodeHeaderValue(headers["x-forwarded-timezone"]) ||
      hints.timezone,
  };

  if (isLocalIp(ipAddress)) {
    return {
      ...details,
      city: details.city || "",
      country: details.country || "",
    };
  }

  return details;
}

function formatLocationDetails(details = {}, ipAddress = "") {
  const parts = [details.city, details.region, details.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  if (parts.length > 0) return parts.join(", ");
  return isLocalIp(ipAddress) ? "Local network on this PC" : "Approximate location unavailable";
}

function parseUserAgent(userAgent = "") {
  const value = userAgent.toString();
  const browser = /Edg\//.test(value)
    ? "Microsoft Edge"
    : /Chrome\//.test(value)
      ? "Chrome"
      : /Firefox\//.test(value)
        ? "Firefox"
        : /Safari\//.test(value)
          ? "Safari"
          : "Unknown browser";
  const os = /Windows/i.test(value)
    ? "Windows"
    : /Android/i.test(value)
      ? "Android"
      : /iPhone|iPad|iOS/i.test(value)
        ? "iOS"
        : /Mac OS|Macintosh/i.test(value)
          ? "macOS"
          : /Linux/i.test(value)
            ? "Linux"
            : "Unknown OS";

  return { browser, os };
}

function deviceMetaFromRequest(req) {
  const userAgent = req.headers["user-agent"] || "";
  const parsed = parseUserAgent(userAgent);
  const ipAddress = getClientIp(req);
  const locationDetails = locationDetailsFromRequest(req, ipAddress);

  return {
    ...parsed,
    deviceName: `${parsed.browser} on ${parsed.os}`,
    ipAddress,
    approximateLocation: formatLocationDetails(locationDetails, ipAddress),
    locationDetails,
    userAgent,
  };
}

async function deliverVerification(user, code, email) {
  if (!code) return { sent: true, delivery: "already_verified" };
  const toEmail = email || user.pendingEmail || user.email;

  try {
    const status = await sendVerificationEmail({
      to: toEmail,
      name: user.fullName,
      code,
    });

    if (!status.sent) {
      console.log(`[LOCAL EMAIL] Verification code for ${toEmail}: ${code}`);
      return { sent: false, delivery: "terminal", reason: status.reason };
    }

    console.log(`[LOCAL EMAIL] Verification email sent to ${toEmail}`);
    return { sent: true, delivery: "smtp" };
  } catch (error) {
    const reason = error.message || "SMTP failed";
    console.error("[LOCAL EMAIL] Could not send verification email:", reason);
    console.log(`[LOCAL EMAIL] Verification code for ${toEmail}: ${code}`);
    return { sent: false, delivery: "terminal", reason };
  }
}

async function deliverPasswordReset(user, code) {
  try {
    const status = await sendPasswordResetEmail({
      to: user.email,
      name: user.fullName,
      code,
    });

    if (!status.sent) {
      console.log(`[LOCAL EMAIL] Password reset code for ${user.email}: ${code}`);
      return { sent: false, delivery: "terminal", reason: status.reason };
    }

    console.log(`[LOCAL EMAIL] Password reset email sent to ${user.email}`);
    return { sent: true, delivery: "smtp" };
  } catch (error) {
    const reason = error.message || "SMTP failed";
    console.error("[LOCAL EMAIL] Could not send password reset email:", reason);
    console.log(`[LOCAL EMAIL] Password reset code for ${user.email}: ${code}`);
    return { sent: false, delivery: "terminal", reason };
  }
}

async function deliverLoginCode(user, code) {
  try {
    const status = await sendLoginCodeEmail({
      to: user.email,
      name: user.fullName,
      code,
    });

    if (!status.sent) {
      console.log(`[LOCAL EMAIL] Login code for ${user.email}: ${code}`);
      return { sent: false, delivery: "terminal", reason: status.reason };
    }

    console.log(`[LOCAL EMAIL] Login code email sent to ${user.email}`);
    return { sent: true, delivery: "smtp" };
  } catch (error) {
    const reason = error.message || "SMTP failed";
    console.error("[LOCAL EMAIL] Could not send login code:", reason);
    console.log(`[LOCAL EMAIL] Login code for ${user.email}: ${code}`);
    return { sent: false, delivery: "terminal", reason };
  }
}

async function deliverLoginAlert(user, session, req) {
  const enabled = user?.security?.loginAlertsEnabled !== false && env.LOGIN_ALERT_EMAILS;
  if (!enabled || !user?.email) return { sent: false, skipped: true };
  if (session?.trusted && env.LOGIN_ALERT_TRUSTED_DEVICE_SKIP) return { sent: false, skipped: true };
  const origin = session?.approximateLocation || "Approximate location unavailable";

  try {
    const status = await sendLoginAlertEmail({
      to: user.email,
      name: user.fullName,
      device: session,
      ipAddress: session?.ipAddress || getClientIp(req),
      location: origin,
      locationDetails: session?.locationDetails || {},
      time: new Date().toLocaleString(),
      securityUrl: `${env.CLIENT_URL}/settings`,
    });

    if (!status.sent) {
      console.log(`[LOCAL EMAIL] Login alert for ${user.email}: ${session?.deviceName || "Unknown device"} from ${origin}`);
      return { sent: false, delivery: "terminal", reason: status.reason };
    }

    return { sent: true, delivery: "smtp" };
  } catch (error) {
    const reason = error.message || "SMTP failed";
    console.error("[LOCAL EMAIL] Could not send login alert:", reason);
    console.log(`[LOCAL EMAIL] Login alert for ${user.email}: ${session?.deviceName || "Unknown device"} from ${origin}`);
    return { sent: false, delivery: "terminal", reason };
  }
}

export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const newUser = await createUser({
      email,
      fullName,
      password,
      profilePic: makeLocalAvatar(fullName),
    });
    const verification = await startEmailVerificationFor(newUser._id);
    const mail = await deliverVerification(verification.user, verification.code, verification.email);
    const session = await createSessionFor(newUser._id, deviceMetaFromRequest(req));

    setAuthCookie(res, newUser._id, session.id);
    res.status(201).json({
      success: true,
      user: verification.user,
      session,
      message: mail.delivery === "smtp"
        ? "Account created. Check your email for the verification code."
        : "Account created. SMTP is not configured, so the verification code was printed in the local server terminal.",
      mail,
    });
  } catch (error) {
    console.log("Error in signup controller", error);
    sendError(res, error);
  }
}

export async function login(req, res) {
  try {
    const { email, login, password } = req.body;
    const loginValue = (login || email || "").trim();

    if (!loginValue || !password) {
      return res.status(400).json({ message: "Enter your email/username and password" });
    }

    const user = await findUserByLogin(loginValue);
    if (!user) return res.status(401).json({ message: "Invalid email, username, or password" });

    const isPasswordCorrect = await verifyPassword(user, password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email, username, or password" });
    }

    if (user.security?.emailCodeOnLogin) {
      const challenge = await startLoginChallengeFor(user._id, deviceMetaFromRequest(req));
      const mail = await deliverLoginCode(challenge.user, challenge.code);
      return res.status(200).json({
        success: true,
        requiresEmailCode: true,
        challengeId: challenge.challengeId,
        message: "Enter the code sent to your email.",
        mail,
      });
    }

    const session = await createSessionFor(user._id, deviceMetaFromRequest(req));
    setAuthCookie(res, user._id, session.id);
    const alert = await deliverLoginAlert(publicUser(user), session, req);
    res.status(200).json({ success: true, user: publicUser(user), session, alert });
  } catch (error) {
    console.log("Error in login controller", error.message);
    sendError(res, error);
  }
}

export async function verifyLoginCode(req, res) {
  try {
    const { challengeId, code } = req.body;
    if (!challengeId || !code) {
      return res.status(400).json({ message: "Enter the login code from your email." });
    }

    const verified = await verifyLoginChallengeFor(challengeId, code);
    const meta = {
      ...verified.deviceMeta,
      ...deviceMetaFromRequest(req),
    };
    const session = await createSessionFor(verified.userId, meta);
    setAuthCookie(res, verified.userId, session.id);
    const alert = await deliverLoginAlert(verified.user, session, req);

    res.status(200).json({
      success: true,
      user: verified.user,
      session,
      alert,
      message: "Login confirmed.",
    });
  } catch (error) {
    sendError(res, error, "Invalid or expired code.");
  }
}

export async function logout(req, res) {
  try {
    const token = req.cookies?.[env.COOKIE_NAME] || req.cookies?.jwt;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded?.userId && decoded?.sessionId) {
        await revokeSessionFor(decoded.userId, decoded.sessionId).catch(() => null);
      }
    }
  } catch {
    // Clear the cookie even if the local token is already invalid.
  }
  res.clearCookie(env.COOKIE_NAME, authCookieOptions);
  if (env.COOKIE_NAME !== "jwt") res.clearCookie("jwt", authCookieOptions);
  res.status(200).json({ success: true, message: "Logged out successfully" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const {
      fullName,
      username,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      profilePic,
      isPrivate,
      allowMessagesFrom,
      showFollowers,
      showFollowing,
      readReceiptsEnabled,
      cameraEnabled,
      micEnabled,
    } = req.body;

    if (!fullName || !username || !nativeLanguage || !learningLanguage) {
      return res.status(400).json({
        message: "Display name, username, native language, and learning language are required.",
        missingFields: [
          !fullName && "fullName",
          !username && "username",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
        ].filter(Boolean),
      });
    }

    const updatedUser = await updateUser(userId, {
      fullName,
      username,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      profilePic: profilePic || makeLocalAvatar(fullName),
      isPrivate,
      allowMessagesFrom,
      showFollowers,
      showFollowing,
      readReceiptsEnabled,
      cameraEnabled,
      micEnabled,
      isOnboarded: true,
    });

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    sendError(res, error);
  }
}

export async function sendVerificationCode(req, res) {
  try {
    const verification = await startEmailVerificationFor(req.user.id);
    const mail = await deliverVerification(verification.user, verification.code, verification.email);
    res.status(200).json({
      success: true,
      user: verification.user,
      alreadyVerified: verification.alreadyVerified,
      message: verification.alreadyVerified
        ? "Your email is already verified."
        : mail.delivery === "smtp"
          ? `Verification code sent to ${verification.email}.`
          : "SMTP is not configured, so the verification code was printed in the local server terminal.",
      mail,
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function verifyEmail(req, res) {
  try {
    const user = await verifyEmailCodeFor(req.user.id, req.body.code || "");
    res.status(200).json({
      success: true,
      user,
      message: "Email verified. Posting, messaging, follows, and reports are unlocked.",
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function forgotPassword(req, res) {
  try {
    const login = (req.body.login || req.body.email || "").trim();
    if (!login) {
      return res.status(400).json({ message: "Enter your email or username" });
    }

    const reset = await startPasswordResetFor(login);
    if (reset) {
      const mail = await deliverPasswordReset(reset.user, reset.code);
      return res.status(200).json({
        success: true,
        message: mail.delivery === "smtp"
          ? "Password reset code sent to your email."
          : "SMTP is not configured, so the password reset code was printed in the local server terminal.",
        mail,
      });
    }

    res.status(200).json({
      success: true,
      message: "If that account exists, a reset code was sent.",
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function resetPassword(req, res) {
  try {
    const login = (req.body.login || req.body.email || "").trim();
    const { code, password } = req.body;

    if (!login || !code || !password) {
      return res.status(400).json({ message: "Email/username, code, and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const user = await resetPasswordFor(login, code, password);
    res.status(200).json({
      success: true,
      user,
      message: "Password reset. You can sign in with your new password.",
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getSessions(req, res) {
  try {
    const sessions = await getSessionsForUser(req.user.id, req.sessionId);
    res.status(200).json({ sessions });
  } catch (error) {
    sendError(res, error);
  }
}

export async function revokeSession(req, res) {
  try {
    const result = await revokeSessionFor(req.user.id, req.params.sessionId);
    if (req.params.sessionId === req.sessionId) {
      res.clearCookie(env.COOKIE_NAME, authCookieOptions);
      if (env.COOKIE_NAME !== "jwt") res.clearCookie("jwt", authCookieOptions);
    }
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function logoutOtherSessions(req, res) {
  try {
    res.status(200).json(await revokeOtherSessionsFor(req.user.id, req.sessionId));
  } catch (error) {
    sendError(res, error);
  }
}

export async function logoutAllSessions(req, res) {
  try {
    const result = await revokeAllSessionsFor(req.user.id);
    res.clearCookie(env.COOKIE_NAME, authCookieOptions);
    if (env.COOKIE_NAME !== "jwt") res.clearCookie("jwt", authCookieOptions);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function trustSession(req, res) {
  try {
    const session = await setSessionTrustFor(req.user.id, req.params.sessionId, req.body.trusted !== false);
    res.status(200).json(session);
  } catch (error) {
    sendError(res, error);
  }
}

export async function setEmailCodeLogin(req, res) {
  try {
    const user = await updateUser(req.user.id, {
      security: {
        emailCodeOnLogin: Boolean(req.body.enabled),
      },
    });
    res.status(200).json({
      success: true,
      user,
      message: Boolean(req.body.enabled)
        ? "Email code login is on."
        : "Email code login is off.",
    });
  } catch (error) {
    sendError(res, error);
  }
}
