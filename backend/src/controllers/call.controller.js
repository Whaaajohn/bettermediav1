import { env } from "../config/env.js";

export function getCallConfig(req, res) {
  const iceServers = env.STUN_URLS.map((url) => ({ urls: url }));

  if (env.TURN_ENABLED && env.TURN_URL) {
    iceServers.push({
      urls: env.TURN_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_PASSWORD,
    });
  }

  res.status(200).json({
    signalingEnabled: env.CALL_SIGNALING_ENABLED,
    iceServers,
    relayFallback: true,
    message: env.TURN_ENABLED ? "TURN configured" : "Using STUN/local relay fallback",
  });
}
