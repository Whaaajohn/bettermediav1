import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { io } from "socket.io-client";
import {
  MicIcon,
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { CallContext } from "../context/callContext";
import { playCallSound, primeCallAudio } from "../lib/callAudio";
import CallPage from "../pages/CallPage";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
const ACTIVE_CALL_KEY = "better-media-active-call";

function saveActiveCall(call) {
  if (call) {
    sessionStorage.setItem(ACTIVE_CALL_KEY, JSON.stringify(call));
  } else {
    sessionStorage.removeItem(ACTIVE_CALL_KEY);
  }
}

function loadActiveCall() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_CALL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAudioMode(call) {
  const mode = String(call?.mode || "").toLowerCase();
  return mode === "audio" || mode === "voice";
}

function IncomingCallCard({ call, muted, onAnswer, onDecline, onToggleMute }) {
  const isAudio = isAudioMode(call);
  const caller = call?.caller;

  return (
    <div className="fixed right-4 top-4 z-[10000] w-[min(23rem,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#24212b]/95 text-white shadow-2xl backdrop-blur-xl">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="size-12 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
              {caller?.profilePic ? (
                <img
                  src={caller.profilePic}
                  alt={caller?.fullName || "Caller"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-lg font-semibold">
                  {(caller?.fullName || "U").slice(0, 1)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/50">
                Incoming {isAudio ? "audio" : "video"} call
              </p>

              <h2 className="truncate text-lg font-semibold">
                {caller?.fullName || "Someone"}
              </h2>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/15"
              aria-label={muted ? "Turn ring sound on" : "Mute ring sound"}
              title={muted ? "Turn ring sound on" : "Mute ring sound"}
            >
              {muted ? (
                <VolumeXIcon className="size-4" />
              ) : (
                <Volume2Icon className="size-4" />
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-white/55">
            {isAudio ? (
              <PhoneIcon className="size-4 text-emerald-400" />
            ) : (
              <VideoIcon className="size-4 text-emerald-400" />
            )}

            <span>Ringing on this device</span>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-white/10">
          <button
            type="button"
            onClick={onDecline}
            className="flex h-12 items-center justify-center gap-2 text-red-400 transition hover:bg-red-500/10"
          >
            <PhoneOffIcon className="size-4" />
            <span className="text-sm font-medium">Decline</span>
          </button>

          <button
            type="button"
            onClick={onAnswer}
            className="flex h-12 items-center justify-center gap-2 text-emerald-400 transition hover:bg-emerald-500/10"
          >
            {isAudio ? (
              <PhoneIcon className="size-4" />
            ) : (
              <VideoIcon className="size-4" />
            )}
            <span className="text-sm font-medium">Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallProvider({ authUser, enabled, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const socketRef = useRef(null);
  const activeCallRef = useRef(null);
  const incomingCallRef = useRef(null);

  const userId = authUser?._id;

  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCallState] = useState(loadActiveCall);
  const [callStatus, setCallStatus] = useState(() =>
    loadActiveCall() ? "accepted" : "idle"
  );
  const [socketStatus, setSocketStatus] = useState("idle");
  const [ringMuted, setRingMuted] = useState(false);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const setActiveCall = useCallback((call) => {
    activeCallRef.current = call;
    setActiveCallState(call);
    saveActiveCall(call);
  }, []);

  const clearCall = useCallback(() => {
    incomingCallRef.current = null;
    activeCallRef.current = null;

    setIncomingCall(null);
    setCallStatus("idle");
    setActiveCall(null);
  }, [setActiveCall]);

  useEffect(() => {
    if (!enabled || !userId) {
      socketRef.current?.disconnect();
      socketRef.current = null;

      setSocket(null);
      setSocketStatus("idle");
      clearCall();
      return;
    }

    const nextSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 350,
      reconnectionDelayMax: 1800,
      timeout: 5000,
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);
    setSocketStatus("connecting");

    const handleConnect = () => {
      setSocketStatus("connected");
      toast.dismiss("call-signal");
    };

    const handleConnectError = (error) => {
      console.error("[CALL] Signaling connection failed:", error.message);
      setSocketStatus("error");

      toast.error("Call service is reconnecting...", {
        id: "call-signal",
      });
    };

    const handleDisconnect = (reason) => {
      setSocketStatus(reason === "io client disconnect" ? "idle" : "reconnecting");

      if (reason !== "io client disconnect") {
        toast.loading("Call service reconnecting...", {
          id: "call-signal",
        });
      }
    };

    const handleReconnect = () => {
      setSocketStatus("connected");
      toast.success("Call service reconnected", {
        id: "call-signal",
      });
    };

    const handleIncomingCall = (call) => {
      const currentActiveCall = activeCallRef.current;

      if (currentActiveCall?.callId && currentActiveCall.callId !== call.callId) {
        nextSocket.emit("call:decline", {
          callId: call.callId,
          reason: "busy",
        });

        return;
      }

      setIncomingCall(call);
      setCallStatus("incoming");

      toast(`${call.caller?.fullName || "Someone"} is calling`, {
        duration: 4500,
      });
    };

    const handleRinging = (call) => {
      setActiveCall(call);
      setCallStatus("ringing");

      playCallSound("outgoing");
      toast.success(`Calling ${call.callee?.fullName || "friend"}...`);
    };

    const handleAccepted = (call) => {
      setIncomingCall(null);
      setActiveCall(call);
      setCallStatus("accepted");

      playCallSound("connected");
    };

    const handleDeclined = () => {
      playCallSound("ended");
      toast.error("Call declined");
      clearCall();
    };

    const handleEnded = ({ reason }) => {
      playCallSound("ended");

      if (reason) toast(`Call ended: ${reason}`);
      else toast("Call ended");

      clearCall();

      if (window.location.pathname.startsWith("/call")) {
        navigate("/");
      }
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("connect_error", handleConnectError);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.io.on("reconnect", handleReconnect);

    nextSocket.on("call:incoming", handleIncomingCall);
    nextSocket.on("call:ringing", handleRinging);
    nextSocket.on("call:accepted", handleAccepted);
    nextSocket.on("call:declined", handleDeclined);
    nextSocket.on("call:ended", handleEnded);

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("connect_error", handleConnectError);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.io.off("reconnect", handleReconnect);

      nextSocket.off("call:incoming", handleIncomingCall);
      nextSocket.off("call:ringing", handleRinging);
      nextSocket.off("call:accepted", handleAccepted);
      nextSocket.off("call:declined", handleDeclined);
      nextSocket.off("call:ended", handleEnded);

      nextSocket.disconnect();
    };
  }, [clearCall, enabled, navigate, setActiveCall, userId]);

  const startCall = useCallback(
    (peerUser, mode = "video") => {
      const currentSocket = socketRef.current;

      primeCallAudio();

      if (!currentSocket?.connected) {
        playCallSound("error");
        toast.error("Call service is not ready yet");
        return;
      }

      if (!peerUser?._id) {
        toast.error("Could not find this user");
        return;
      }

      if (activeCallRef.current?.callId || incomingCallRef.current?.callId) {
        toast.error("You are already in a call");
        return;
      }

      const cleanMode = mode === "audio" || mode === "voice" ? "audio" : "video";

      currentSocket.emit(
        "call:start",
        {
          toUserId: peerUser._id,
          mode: cleanMode,
        },
        (response) => {
          if (!response?.success) {
            playCallSound("error");
            toast.error(response?.message || "Could not start call");
            return;
          }

          setActiveCall(response.call);
          setCallStatus("ringing");
        }
      );
    },
    [setActiveCall]
  );

  const answerCall = useCallback(() => {
    const currentSocket = socketRef.current;
    const call = incomingCallRef.current;

    primeCallAudio();

    if (!currentSocket?.connected || !call?.callId) {
      toast.error("Call service is not ready yet");
      return;
    }

    currentSocket.emit(
      "call:accept",
      {
        callId: call.callId,
      },
      (response) => {
        if (!response?.success) {
          playCallSound("error");
          toast.error(response?.message || "Could not answer call");
          setIncomingCall(null);
          setCallStatus("idle");
          return;
        }

        setIncomingCall(null);
        setActiveCall(response.call);
        setCallStatus("accepted");
      }
    );
  }, [setActiveCall]);

  const declineCall = useCallback(() => {
    const currentSocket = socketRef.current;
    const call = incomingCallRef.current;

    primeCallAudio();
    playCallSound("ended");

    if (currentSocket?.connected && call?.callId) {
      currentSocket.emit("call:decline", {
        callId: call.callId,
        reason: "declined",
      });
    }

    setIncomingCall(null);
    setCallStatus(activeCallRef.current ? "accepted" : "idle");
  }, []);

  const joinCall = useCallback(
    (callId) => {
      const currentSocket = socketRef.current;

      return new Promise((resolve, reject) => {
        if (!currentSocket?.connected) {
          reject(new Error("Call service is not connected"));
          return;
        }

        currentSocket.emit(
          "call:join",
          {
            callId,
          },
          (response) => {
            if (!response?.success) {
              const message = response?.message || "Could not join call";

              if (/not found|no longer available|ended/i.test(message)) {
                clearCall();
              }

              reject(new Error(message));
              return;
            }

            resolve(response);
          }
        );
      });
    },
    [clearCall]
  );

  const sendSignal = useCallback((eventName, payload) => {
    socketRef.current?.emit(eventName, payload);
  }, []);

  const endCall = useCallback(
    (reason = "ended") => {
      const currentSocket = socketRef.current;
      const call = activeCallRef.current;

      primeCallAudio();
      playCallSound("ended");

      if (currentSocket?.connected && call?.callId) {
        currentSocket.emit("call:end", {
          callId: call.callId,
          reason,
        });
      }

      clearCall();

      if (location.pathname.startsWith("/call")) {
        navigate("/");
      }
    },
    [clearCall, location.pathname, navigate]
  );

  const value = useMemo(
    () => ({
      activeCall,
      answerCall,
      callStatus,
      declineCall,
      endCall,
      incomingCall,
      joinCall,
      sendSignal,
      socket,
      startCall,
      socketStatus,
    }),
    [
      activeCall,
      answerCall,
      callStatus,
      declineCall,
      endCall,
      incomingCall,
      joinCall,
      sendSignal,
      socket,
      startCall,
      socketStatus,
    ]
  );

  useEffect(() => {
    if (!incomingCall) return;

    if ("Notification" in window && document.hidden) {
      if (Notification.permission === "granted") {
        new Notification("Incoming call", {
          body: `${incomingCall.caller?.fullName || "Someone"} is calling`,
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    if (!ringMuted) playCallSound("incoming");

    const ringInterval = window.setInterval(() => {
      if (!ringMuted) playCallSound("incoming");
    }, 1400);

    const missedTimer = window.setTimeout(() => {
      const currentSocket = socketRef.current;
      const call = incomingCallRef.current;

      if (currentSocket?.connected && call?.callId) {
        currentSocket.emit("call:decline", {
          callId: call.callId,
          reason: "missed",
        });
      }

      setIncomingCall(null);
      setCallStatus(activeCallRef.current ? "accepted" : "idle");

      playCallSound("ended");
      toast("Missed call", {
        duration: 3000,
      });
    }, 45000);

    return () => {
      window.clearInterval(ringInterval);
      window.clearTimeout(missedTimer);
    };
  }, [incomingCall, ringMuted]);

  useEffect(() => {
    if (callStatus !== "ringing" || !activeCall) return;

    playCallSound("outgoing");

    const ringInterval = window.setInterval(() => {
      playCallSound("outgoing");
    }, 1800);

    return () => window.clearInterval(ringInterval);
  }, [activeCall, callStatus]);

  return (
    <CallContext.Provider value={value}>
      {children}

      {incomingCall && (
        <IncomingCallCard
          call={incomingCall}
          muted={ringMuted}
          onAnswer={answerCall}
          onDecline={declineCall}
          onToggleMute={() => setRingMuted((value) => !value)}
        />
      )}

      {activeCall?.callId && callStatus !== "idle" && (
        <CallPage callIdOverride={activeCall.callId} floating />
      )}
    </CallContext.Provider>
  );
}
