import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import {
  getPublicUserById,
  recordCallStarted,
  updateCallHistory,
  updatePresence,
} from "./localStore.js";
import { env } from "../config/env.js";
import { getRedisClient } from "../config/redis.js";

const JWT_SECRET = env.JWT_SECRET;
const activeCalls = new Map();
const disconnectTimers = new Map();
const userSockets = new Map();
const ioServers = new Set();

const userRoom = (userId) => `user:${userId}`;
const callRoom = (callId) => `call:${callId}`;

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(valueParts.join("="));
    return cookies;
  }, {});
}

function respond(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

function publicCall(call) {
  if (!call) return null;

  return {
    callId: call.callId,
    callerId: call.callerId,
    calleeId: call.calleeId,
    caller: call.caller,
    callee: call.callee,
    mode: call.mode || "video",
    status: call.status,
    createdAt: call.createdAt,
    acceptedAt: call.acceptedAt,
  };
}

function getRole(call, userId) {
  if (!call || !userId) return null;
  if (call.callerId === userId) return "caller";
  if (call.calleeId === userId) return "callee";
  return null;
}

function getActiveCallOrRespond(callId, ack, message = "Call not found") {
  if (!callId) {
    respond(ack, { success: false, message });
    return null;
  }

  const call = activeCalls.get(callId);
  if (!call) {
    respond(ack, { success: false, message });
    return null;
  }

  return call;
}

function canSignalCall(socket, callId) {
  const call = activeCalls.get(callId);
  const role = getRole(call, socket.user?._id);

  if (!call || !role) {
    console.log(`[LOCAL CALL] Ignored stale signal for missing call ${callId || "unknown"}`);
    return false;
  }

  return true;
}

function addUserSocket(userId, socketId) {
  const sockets = userSockets.get(userId) || new Set();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
  return sockets.size;
}

function removeUserSocket(userId, socketId) {
  const sockets = userSockets.get(userId);
  if (!sockets) return 0;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
    return 0;
  }

  return sockets.size;
}

function getUserSocketCount(userId) {
  return userSockets.get(userId)?.size || 0;
}

function emitCallEnded(io, call, reason) {
  const payload = { callId: call.callId, reason };
  emitToCall(call.callId, "call:ended", payload);
  emitToUser(call.callerId, "call:ended", payload);
  emitToUser(call.calleeId, "call:ended", payload);
  activeCalls.delete(call.callId);
}

function emitToUser(userId, eventName, payload) {
  ioServers.forEach((io) => {
    io.to(userRoom(userId)).emit(eventName, payload);
  });
}

function emitToCall(callId, eventName, payload) {
  ioServers.forEach((io) => {
    io.to(callRoom(callId)).emit(eventName, payload);
  });
}

function emitToCallExcept(sourceIo, sourceSocket, callId, eventName, payload) {
  ioServers.forEach((io) => {
    if (io === sourceIo) {
      sourceSocket.to(callRoom(callId)).emit(eventName, payload);
      return;
    }

    io.to(callRoom(callId)).emit(eventName, payload);
  });
}

async function getUniqueParticipantCount(callId) {
  const roomSocketGroups = await Promise.all(
    [...ioServers].map((io) => io.in(callRoom(callId)).fetchSockets())
  );
  const participantIds = new Set(
    roomSocketGroups
      .flat()
      .map((roomSocket) => roomSocket.data.userId)
      .filter(Boolean)
  );

  return participantIds.size || 1;
}

export function configureSignaling(server, { isAllowedOrigin }) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });
  ioServers.add(io);

  if (env.USE_REDIS_SOCKET_ADAPTER) {
    attachRedisSocketAdapter(io).catch((error) => {
      console.log(`[LOCAL SIGNAL] Redis Socket.IO adapter unavailable, using memory rooms: ${error.message}`);
    });
  }

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies[env.COOKIE_NAME] || cookies.jwt;

      if (!token) {
        return next(new Error("Missing auth cookie"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await getPublicUserById(decoded.userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    const pendingDisconnect = disconnectTimers.get(user._id);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect);
      disconnectTimers.delete(user._id);
    }

    socket.join(userRoom(user._id));
    socket.data.callIds = new Set();
    socket.data.userId = user._id;
    const socketCount = addUserSocket(user._id, socket.id);

    updatePresence(user._id, { isOnline: true }).catch((error) => {
      console.log("[LOCAL SIGNAL] Could not update online status:", error.message);
    });
    console.log(`[LOCAL SIGNAL] ${user.fullName} connected (${user._id}, sockets: ${socketCount})`);

    socket.on("call:start", async ({ toUserId, mode = "video" } = {}, ack) => {
      try {
        const callee = await getPublicUserById(toUserId);

        if (!callee) {
          return respond(ack, { success: false, message: "User is not available" });
        }

        if (callee._id === user._id) {
          return respond(ack, { success: false, message: "You cannot call yourself" });
        }

        const now = new Date().toISOString();
        const call = {
          callId: crypto.randomUUID(),
          callerId: user._id,
          calleeId: callee._id,
          caller: user,
          callee,
          mode: mode === "audio" ? "audio" : "video",
          status: "ringing",
          createdAt: now,
          acceptedAt: null,
        };

        activeCalls.set(call.callId, call);
        await recordCallStarted(call);
        console.log(`[LOCAL CALL] ${user.fullName} is calling ${callee.fullName} (${call.mode}, ${call.callId})`);

        const payload = publicCall(call);
        emitToUser(callee._id, "call:incoming", payload);
        socket.emit("call:ringing", payload);
        respond(ack, { success: true, call: payload });
      } catch (error) {
        console.log("[LOCAL CALL] Failed to start call:", error.message);
        respond(ack, { success: false, message: "Could not start call" });
      }
    });

    socket.on("call:accept", ({ callId } = {}, ack) => {
      const call = getActiveCallOrRespond(callId, ack, "Call is no longer available");
      if (!call) return;

      if (call.calleeId !== user._id) {
        return respond(ack, { success: false, message: "Only the called user can answer" });
      }

      call.status = "accepted";
      call.acceptedAt = new Date().toISOString();
      const payload = publicCall(call);

      updatePresence(call.callerId, { inCall: true }).catch(() => {});
      updatePresence(call.calleeId, { inCall: true }).catch(() => {});
      updateCallHistory(call.callId, {
        status: "accepted",
        acceptedAt: call.acceptedAt,
      }).catch(() => {});
      console.log(`[LOCAL CALL] ${user.fullName} answered ${call.callId}`);
      emitToUser(call.callerId, "call:accepted", payload);
      emitToUser(call.calleeId, "call:accepted", payload);
      respond(ack, { success: true, call: payload });
    });

    socket.on("call:decline", ({ callId } = {}, ack) => {
      const call = activeCalls.get(callId);

      if (!call) {
        return respond(ack, { success: true });
      }

      console.log(`[LOCAL CALL] ${user.fullName} declined ${call.callId}`);
      updateCallHistory(callId, {
        status: "declined",
        endedAt: new Date().toISOString(),
      }).catch(() => {});
      emitToUser(call.callerId, "call:declined", {
        callId,
        byUserId: user._id,
      });
      activeCalls.delete(callId);
      respond(ack, { success: true });
    });

    socket.on("call:join", async ({ callId } = {}, ack) => {
      const call = getActiveCallOrRespond(callId, ack, "Call not found");
      if (!call) return;

      const role = getRole(call, user._id);

      if (!role) {
        return respond(ack, { success: false, message: "Call not found" });
      }

      socket.join(callRoom(callId));
      socket.data.callIds.add(callId);

      const participantCount = await getUniqueParticipantCount(callId);

      console.log(`[LOCAL CALL] ${user.fullName} joined ${callId} as ${role} (${participantCount} user(s))`);
      emitToCallExcept(io, socket, callId, "call:peer-joined", {
        callId,
        user,
        participantCount,
      });

      respond(ack, {
        success: true,
        call: publicCall(call),
        role,
        participantCount,
      });
    });

    socket.on("call:offer", ({ callId, offer } = {}) => {
      if (!canSignalCall(socket, callId)) return;
      console.log(`[LOCAL CALL] Offer relayed for ${callId}`);
      emitToCallExcept(io, socket, callId, "call:offer", {
        callId,
        fromUserId: user._id,
        offer,
      });
    });

    socket.on("call:answer", ({ callId, answer } = {}) => {
      if (!canSignalCall(socket, callId)) return;
      console.log(`[LOCAL CALL] Answer relayed for ${callId}`);
      emitToCallExcept(io, socket, callId, "call:answer", {
        callId,
        fromUserId: user._id,
        answer,
      });
    });

    socket.on("call:ice-candidate", ({ callId, candidate } = {}) => {
      if (!canSignalCall(socket, callId)) return;
      console.log(`[LOCAL CALL] ICE candidate relayed for ${callId}`);
      emitToCallExcept(io, socket, callId, "call:ice-candidate", {
        callId,
        fromUserId: user._id,
        candidate,
      });
    });

    socket.on("call:media-state", ({ callId, mediaState } = {}) => {
      if (!canSignalCall(socket, callId)) return;
      console.log(`[LOCAL CALL] Media state for ${callId}: ${JSON.stringify(mediaState)}`);
      emitToCallExcept(io, socket, callId, "call:media-state", {
        callId,
        fromUserId: user._id,
        mediaState,
      });
    });

    socket.on("call:relay-audio", ({ callId, audio, sampleRate } = {}) => {
      if (!canSignalCall(socket, callId) || !audio) return;
      emitToCallExcept(io, socket, callId, "call:relay-audio", {
        callId,
        fromUserId: user._id,
        audio,
        sampleRate,
      });
    });

    socket.on("call:relay-video-frame", ({ callId, frame } = {}) => {
      if (!canSignalCall(socket, callId) || !frame) return;
      emitToCallExcept(io, socket, callId, "call:relay-video-frame", {
        callId,
        fromUserId: user._id,
        frame,
      });
    });

    socket.on("call:end", ({ callId, reason = "ended" } = {}, ack) => {
      const call = activeCalls.get(callId);

      if (call) {
        console.log(`[LOCAL CALL] ${user.fullName} ended ${callId}: ${reason}`);
        updatePresence(call.callerId, { inCall: false }).catch(() => {});
        updatePresence(call.calleeId, { inCall: false }).catch(() => {});
        updateCallHistory(callId, {
          status: reason === "peer disconnected" ? "missed" : "ended",
          endedAt: new Date().toISOString(),
        }).catch(() => {});
        emitCallEnded(io, call, reason);
      }

      respond(ack, { success: true });
    });

    socket.on("chat:typing", ({ toUserId, isTyping } = {}) => {
      if (!toUserId) return;
      socket.to(userRoom(toUserId)).emit("chat:typing", {
        fromUserId: user._id,
        user,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[LOCAL SIGNAL] ${user.fullName} disconnected: ${reason}`);
      const remainingSockets = removeUserSocket(user._id, socket.id);
      if (remainingSockets > 0) {
        console.log(`[LOCAL SIGNAL] ${user.fullName} still has ${remainingSockets} active socket(s)`);
        return;
      }

      const affectedCallIds = [...socket.data.callIds];
      const timer = setTimeout(() => {
        if (getUserSocketCount(user._id) > 0) {
          disconnectTimers.delete(user._id);
          return;
        }

        updatePresence(user._id, { isOnline: false, inCall: false }).catch(() => {});

        affectedCallIds.forEach((callId) => {
          const call = activeCalls.get(callId);
          if (call) {
            updatePresence(call.callerId, { inCall: false }).catch(() => {});
            updatePresence(call.calleeId, { inCall: false }).catch(() => {});
            updateCallHistory(callId, {
              status: "ended",
              endedAt: new Date().toISOString(),
            }).catch(() => {});
            emitCallEnded(io, call, "peer disconnected");
          }
        });
        disconnectTimers.delete(user._id);
      }, 8000);

      disconnectTimers.set(user._id, timer);
    });
  });

  console.log("[LOCAL SIGNAL] Socket signaling is ready on this PC");
  return io;
}

async function attachRedisSocketAdapter(io) {
  const pubClient = getRedisClient();
  if (!pubClient) throw new Error("Redis client is not connected");

  const [{ createAdapter }] = await Promise.all([import("@socket.io/redis-adapter")]);
  const subClient = pubClient.duplicate();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[LOCAL SIGNAL] Redis Socket.IO adapter is enabled");
}
