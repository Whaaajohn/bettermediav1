import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeftIcon,
  Maximize2Icon,
  MicIcon,
  MicOffIcon,
  Minimize2Icon,
  PhoneOffIcon,
  ScreenShareIcon,
  ScreenShareOffIcon,
  VideoIcon,
  VideoOffIcon,
  Volume2Icon,
} from "lucide-react";
import toast from "react-hot-toast";

import PageLoader from "../components/PageLoader";
import useAuthUser from "../hooks/useAuthUser";
import useCall from "../hooks/useCall";
import { playCallSound, primeCallAudio } from "../lib/callAudio";

function parseIceServers() {
  const configured = import.meta.env.VITE_RTC_ICE_SERVERS;

  if (configured) {
    try {
      const parsed = JSON.parse(configured);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return configured
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => ({ urls: url }));
    }
  }

  return [{ urls: "stun:stun.l.google.com:19302" }];
}

const peerConnectionConfig = {
  iceServers: parseIceServers(),
  iceCandidatePoolSize: 6,
  iceTransportPolicy: import.meta.env.VITE_RTC_ICE_TRANSPORT_POLICY || "all",
};

const CALL_RELAY_MODE = import.meta.env.VITE_CALL_MEDIA_RELAY || "auto";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const audioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
  latency: 0,
};

function shouldPreferSocketRelay() {
  if (CALL_RELAY_MODE === "always") return true;
  if (CALL_RELAY_MODE === "never") return false;
  return !LOCAL_HOSTS.has(window.location.hostname);
}

function getPeer(call, currentUserId) {
  if (!call) return null;
  return call.callerId === currentUserId ? call.callee : call.caller;
}

function isAudioMode(call) {
  const mode = String(call?.mode || "").toLowerCase();
  return mode === "audio" || mode === "voice";
}

function getMediaErrorMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Microphone or camera permission was blocked. Allow this site in the browser, then try again.";
  }

  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "No microphone or camera was found on this device.";
  }

  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
    return "Your microphone or camera is already being used by another app.";
  }

  return error?.message || "Camera, microphone, or call service is unavailable.";
}

function floatToPcm16(samples) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

function pcm16ToFloat32(buffer) {
  const view = new DataView(buffer);
  const samples = new Float32Array(view.byteLength / 2);

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x8000;
  }

  return samples;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function Waveform({ active = true }) {
  return (
    <div className="flex h-7 items-center gap-[3px] overflow-hidden">
      {Array.from({ length: 42 }).map((_, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full bg-emerald-400 ${
            active ? "animate-pulse" : "opacity-25"
          }`}
          style={{
            height: `${5 + Math.abs(Math.sin(index * 0.7)) * 22}px`,
            animationDelay: `${index * 35}ms`,
          }}
        />
      ))}
    </div>
  );
}

function ControlCell({ danger, active, disabled, onClick, label, icon, text }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "h-12 flex items-center justify-center gap-2 border-t border-white/10 transition active:scale-[0.98] disabled:opacity-40",
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : active
          ? "text-white hover:bg-white/10"
          : "text-white/45 hover:bg-white/10",
      ].join(" ")}
    >
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </button>
  );
}

function RoundControl({ danger, active, disabled, onClick, label, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "size-12 rounded-full grid place-items-center transition active:scale-95 disabled:opacity-40",
        danger
          ? "bg-red-500 text-white hover:bg-red-600"
          : active
          ? "bg-white text-black hover:bg-white/90"
          : "bg-white/14 text-white hover:bg-white/20 border border-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function VideoView({
  label,
  stream,
  relayFrame = "",
  muted = false,
  cameraOff = false,
  isMuted = false,
  isScreen = false,
  placeholder = "Waiting for video",
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const hasVideo = stream?.getVideoTracks().some((track) => track.readyState === "live");
  const hasAnyTrack = stream?.getTracks().length > 0;
  const showRelayFrame = Boolean(relayFrame && !hasVideo && !cameraOff);
  const showCameraOff = Boolean(!showRelayFrame && (cameraOff || (stream && hasAnyTrack && !hasVideo)));

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
    if (audioRef.current) audioRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-black">
      {showRelayFrame ? (
        <img src={relayFrame} alt={label} className="h-full w-full object-cover" />
      ) : showCameraOff ? (
        <>
          <audio ref={audioRef} autoPlay playsInline muted={muted} />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="space-y-2">
              <div className="mx-auto size-14 rounded-full bg-white/10 grid place-items-center">
                <VideoOffIcon className="size-6 text-white/70" />
              </div>
              <p className="text-sm text-white/60">Camera off</p>
            </div>
          </div>
        </>
      ) : stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full ${isScreen ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <p className="text-sm text-white/55">{placeholder}</p>
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white backdrop-blur-md">
        <span className="max-w-[10rem] truncate">{label}</span>
        {isMuted && <MicOffIcon className="size-3.5 text-yellow-300" />}
        {cameraOff && <VideoOffIcon className="size-3.5 text-yellow-300" />}
      </div>
    </div>
  );
}

function AudioMiniBar({
  peer,
  elapsedSeconds,
  mediaState,
  remoteMediaState,
  statusText,
  onDragStart,
  onExpand,
  onToggleCamera,
  onToggleMic,
  onEnd,
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#2b2430]/95 text-white shadow-2xl backdrop-blur-xl">
      <div onPointerDown={onDragStart} className="cursor-grab px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="size-11 overflow-hidden rounded-full bg-white/10 shrink-0">
            {peer?.profilePic ? (
              <img
                src={peer.profilePic}
                alt={peer?.fullName || "Friend"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center font-semibold">
                {(peer?.fullName || "F").slice(0, 1)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-semibold">{peer?.fullName || "Friend"}</p>
              <p className="shrink-0 text-sm font-semibold">{formatDuration(elapsedSeconds)}</p>
            </div>

            <div className="mt-1">
              <Waveform active={mediaState.mic && remoteMediaState.mic} />
            </div>
          </div>

          <button
            type="button"
            onClick={onExpand}
            className="size-8 rounded-full bg-white/10 grid place-items-center hover:bg-white/15"
            aria-label="Expand call"
          >
            <Maximize2Icon className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-white/45">{statusText}</p>
      </div>

      <div className="grid grid-cols-3 border-t border-white/10">
        <ControlCell
          active={mediaState.camera}
          onClick={onToggleCamera}
          label="Video"
          icon={mediaState.camera ? <VideoIcon className="size-4" /> : <VideoOffIcon className="size-4" />}
          text="Video"
        />

        <ControlCell
          active={mediaState.mic}
          onClick={onToggleMic}
          label="Mute"
          icon={mediaState.mic ? <MicIcon className="size-4" /> : <MicOffIcon className="size-4" />}
          text={mediaState.mic ? "Mute" : "Unmute"}
        />

        <ControlCell
          danger
          onClick={onEnd}
          label="End"
          icon={<PhoneOffIcon className="size-4" />}
          text="End"
        />
      </div>
    </div>
  );
}

function VideoMiniBar({
  peer,
  elapsedSeconds,
  statusText,
  remoteStream,
  remoteRelayFrame,
  remoteMediaState,
  onDragStart,
  onExpand,
  onToggleCamera,
  onToggleMic,
  onEnd,
  mediaState,
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#111217]/95 text-white shadow-2xl backdrop-blur-xl">
      <div onPointerDown={onDragStart} className="cursor-grab p-2 active:cursor-grabbing">
        <div className="h-40 overflow-hidden rounded-[1rem] bg-black">
          <VideoView
            label={peer?.fullName || "Friend"}
            stream={remoteStream}
            relayFrame={remoteRelayFrame}
            cameraOff={!remoteMediaState.camera}
            isMuted={!remoteMediaState.mic}
            placeholder="Waiting for video"
          />
        </div>

        <div className="flex items-center justify-between px-2 pt-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{peer?.fullName || "Friend"}</p>
            <p className="text-xs text-white/45">
              {formatDuration(elapsedSeconds)} • {statusText}
            </p>
          </div>

          <button
            type="button"
            onClick={onExpand}
            className="size-8 rounded-full bg-white/10 grid place-items-center hover:bg-white/15"
            aria-label="Expand call"
          >
            <Maximize2Icon className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/10">
        <ControlCell
          active={mediaState.camera}
          onClick={onToggleCamera}
          label="Video"
          icon={mediaState.camera ? <VideoIcon className="size-4" /> : <VideoOffIcon className="size-4" />}
          text="Video"
        />

        <ControlCell
          active={mediaState.mic}
          onClick={onToggleMic}
          label="Mute"
          icon={mediaState.mic ? <MicIcon className="size-4" /> : <MicOffIcon className="size-4" />}
          text={mediaState.mic ? "Mute" : "Unmute"}
        />

        <ControlCell
          danger
          onClick={onEnd}
          label="End"
          icon={<PhoneOffIcon className="size-4" />}
          text="End"
        />
      </div>
    </div>
  );
}

export default function CallPage({ callIdOverride, floating = false }) {
  const { id } = useParams();
  const callId = callIdOverride || id;
  const { authUser, isLoading } = useAuthUser();
  const { activeCall, endCall, joinCall, sendSignal, socket, socketStatus } = useCall();

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const offerSentRef = useRef(false);
  const makingOfferRef = useRef(false);
  const roleRef = useRef(null);
  const mediaStateRef = useRef({ mic: true, camera: true, screen: false });
  const connectionStateRef = useRef("new");
  const relayAudioContextRef = useRef(null);
  const relayAudioSourceRef = useRef(null);
  const relayAudioProcessorRef = useRef(null);
  const relayAudioGainRef = useRef(null);
  const relayAudioPlaybackTimeRef = useRef(0);
  const relayVideoElementRef = useRef(null);
  const relayVideoTimerRef = useRef(null);
  const relayCanvasRef = useRef(null);
  const relayEnabledRef = useRef(false);
  const dragRef = useRef(null);

  const [statusText, setStatusText] = useState("Connecting");
  const [localPreviewStream, setLocalPreviewStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState("");
  const [mediaState, setMediaState] = useState({ mic: true, camera: true, screen: false });
  const [remoteMediaState, setRemoteMediaState] = useState({ mic: true, camera: true, screen: false });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [relayMode, setRelayMode] = useState(false);
  const [remoteRelayFrame, setRemoteRelayFrame] = useState("");
  const [expanded, setExpanded] = useState(!floating);
  const [miniPosition, setMiniPosition] = useState(() => ({
    x: Math.max(12, window.innerWidth - 430),
    y: 18,
  }));

  const peer = getPeer(activeCall, authUser?._id);
  const canUseCall = activeCall?.callId === callId;
  const audioCall = isAudioMode(activeCall);
  const screenActive = mediaState.screen || remoteMediaState.screen;

  useEffect(() => {
    if (!activeCall) return;

    const startedAt = new Date(activeCall.acceptedAt || activeCall.createdAt || Date.now()).getTime();

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    updateElapsed();

    const timer = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timer);
  }, [activeCall]);

  const publishMediaState = useCallback(
    (patch) => {
      const next = { ...mediaStateRef.current, ...patch };

      mediaStateRef.current = next;
      setMediaState(next);

      sendSignal("call:media-state", {
        callId,
        mediaState: next,
      });

      return next;
    },
    [callId, sendSignal]
  );

  const stopMediaRelay = useCallback(() => {
    relayEnabledRef.current = false;

    if (relayVideoTimerRef.current) {
      window.clearInterval(relayVideoTimerRef.current);
      relayVideoTimerRef.current = null;
    }

    relayAudioProcessorRef.current?.disconnect();
    relayAudioSourceRef.current?.disconnect();
    relayAudioGainRef.current?.disconnect();

    relayAudioProcessorRef.current = null;
    relayAudioSourceRef.current = null;
    relayAudioGainRef.current = null;

    setRelayMode(false);
  }, []);

  const startMediaRelay = useCallback(
    (stream, reason = "Relay active") => {
      if (!socket?.connected || !stream || relayEnabledRef.current) return;

      relayEnabledRef.current = true;
      setRelayMode(true);
      setStatusText(reason);

      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length > 0 && window.AudioContext) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        const audioContext = relayAudioContextRef.current || new AudioContextCtor();

        relayAudioContextRef.current = audioContext;
        audioContext.resume?.().catch(() => {});

        const source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        const silentGain = audioContext.createGain();

        silentGain.gain.value = 0;

        processor.onaudioprocess = (event) => {
          if (!relayEnabledRef.current || !mediaStateRef.current.mic || !socket.connected) return;

          const samples = event.inputBuffer.getChannelData(0);

          socket.emit("call:relay-audio", {
            callId,
            audio: floatToPcm16(samples),
            sampleRate: audioContext.sampleRate,
          });
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);

        relayAudioSourceRef.current = source;
        relayAudioProcessorRef.current = processor;
        relayAudioGainRef.current = silentGain;
      }

      if (!relayVideoTimerRef.current) {
        relayVideoTimerRef.current = window.setInterval(() => {
          const shouldSendVideo =
            mediaStateRef.current.camera || mediaStateRef.current.screen;

          if (!relayEnabledRef.current || !shouldSendVideo || !socket.connected) return;

          const video = relayVideoElementRef.current;

          if (!video || video.readyState < 2 || video.videoWidth === 0) return;

          const canvas = relayCanvasRef.current || document.createElement("canvas");
          relayCanvasRef.current = canvas;

          const width = Math.min(360, video.videoWidth);
          const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");
          context.drawImage(video, 0, 0, width, height);

          socket.emit("call:relay-video-frame", {
            callId,
            frame: canvas.toDataURL("image/jpeg", 0.48),
          });
        }, 420);
      }
    },
    [callId, socket]
  );

  useEffect(() => {
    if (relayVideoElementRef.current) {
      relayVideoElementRef.current.srcObject = localPreviewStream || null;
    }
  }, [localPreviewStream]);

  const createOfferNow = useCallback(
    async ({ force = true, iceRestart = false } = {}) => {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) return;
      if (makingOfferRef.current || peerConnection.signalingState !== "stable") return;
      if (!force && offerSentRef.current) return;

      makingOfferRef.current = true;

      try {
        offerSentRef.current = true;

        const offer = await peerConnection.createOffer(
          iceRestart ? { iceRestart: true } : undefined
        );

        await peerConnection.setLocalDescription(offer);

        sendSignal("call:offer", {
          callId,
          offer,
        });

        setStatusText(iceRestart ? "Repairing media" : "Updating call");
      } finally {
        makingOfferRef.current = false;
      }
    },
    [callId, sendSignal]
  );

  const replaceOrAddVideoTrack = useCallback(
    async (track, streamForTrack) => {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) return false;

      const sender = peerConnection
        .getSenders()
        .find((item) => item.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(track || null);
        return true;
      }

      if (track && streamForTrack) {
        peerConnection.addTrack(track, streamForTrack);
        await createOfferNow({ force: true });
        return true;
      }

      return false;
    },
    [createOfferNow]
  );

  useEffect(() => {
    if (!socket || !canUseCall || !authUser?._id) {
      setIsConnecting(false);
      return;
    }

    let cancelled = false;
    let relayFallbackTimer = null;

    const peerConnection = new RTCPeerConnection(peerConnectionConfig);
    const nextRemoteStream = new MediaStream();

    peerConnectionRef.current = peerConnection;
    pendingCandidatesRef.current = [];
    offerSentRef.current = false;

    setRemoteStream(nextRemoteStream);

    const flushPendingCandidates = async () => {
      if (!peerConnection.remoteDescription) return;

      const candidates = pendingCandidatesRef.current.splice(0);

      await Promise.all(
        candidates.map((candidate) =>
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
            console.error("[CALL] Could not add queued ICE candidate:", err);
          })
        )
      );
    };

    const createOffer = async ({ force = false, iceRestart = false } = {}) => {
      if (makingOfferRef.current || peerConnection.signalingState !== "stable") return;
      if (!force && offerSentRef.current) return;

      makingOfferRef.current = true;

      try {
        offerSentRef.current = true;

        const offer = await peerConnection.createOffer(
          iceRestart ? { iceRestart: true } : undefined
        );

        await peerConnection.setLocalDescription(offer);

        sendSignal("call:offer", {
          callId,
          offer,
        });

        setStatusText(iceRestart ? "Repairing media" : "Calling peer");
      } finally {
        makingOfferRef.current = false;
      }
    };

    const handlePeerJoined = ({ callId: joinedCallId, user: joinedUser }) => {
      if (joinedUser?._id === authUser?._id) return;

      if (joinedCallId === callId && roleRef.current === "caller") {
        createOffer({
          force: true,
          iceRestart: offerSentRef.current,
        }).catch((err) => {
          console.error("[CALL] Could not create offer:", err);
          setError("Could not start the peer connection.");
        });
      }
    };

    const handleOffer = async ({ callId: offerCallId, offer }) => {
      if (offerCallId !== callId || !offer) return;

      try {
        setStatusText("Answering");

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingCandidates();

        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        sendSignal("call:answer", {
          callId,
          answer,
        });
      } catch (err) {
        console.error("[CALL] Could not answer offer:", err);
        setError("Could not answer the call.");
      }
    };

    const handleAnswer = async ({ callId: answerCallId, answer }) => {
      if (answerCallId !== callId || !answer) return;

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates();
        setStatusText("Connected");
      } catch (err) {
        console.error("[CALL] Could not set remote answer:", err);
        setError("Could not finish the call connection.");
      }
    };

    const handleIceCandidate = async ({ callId: candidateCallId, candidate }) => {
      if (candidateCallId !== callId || !candidate) return;

      try {
        if (!peerConnection.remoteDescription) {
          pendingCandidatesRef.current.push(candidate);
          return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[CALL] Could not add ICE candidate:", err);
      }
    };

    const handleRemoteMediaState = ({ callId: mediaCallId, mediaState: nextRemoteState }) => {
      if (mediaCallId === callId && nextRemoteState) {
        setRemoteMediaState(nextRemoteState);
      }
    };

    const handleRelayAudio = async ({ callId: relayCallId, audio, sampleRate }) => {
      if (relayCallId !== callId || !audio || connectionStateRef.current === "connected") return;

      try {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;

        const audioContext = relayAudioContextRef.current || new AudioContextCtor();
        relayAudioContextRef.current = audioContext;

        if (audioContext.state === "suspended") await audioContext.resume();

        let audioBuffer = audio;

        if (ArrayBuffer.isView(audio)) {
          audioBuffer = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength);
        } else if (audio?.type === "Buffer" && Array.isArray(audio.data)) {
          audioBuffer = new Uint8Array(audio.data).buffer;
        }

        const samples = pcm16ToFloat32(audioBuffer);
        const playbackBuffer = audioContext.createBuffer(
          1,
          samples.length,
          sampleRate || audioContext.sampleRate
        );

        playbackBuffer.copyToChannel(samples, 0);

        const source = audioContext.createBufferSource();
        source.buffer = playbackBuffer;
        source.connect(audioContext.destination);

        const startAt = Math.max(
          audioContext.currentTime + 0.08,
          relayAudioPlaybackTimeRef.current || 0
        );

        source.start(startAt);
        relayAudioPlaybackTimeRef.current = startAt + playbackBuffer.duration;

        setRelayMode(true);
      } catch (err) {
        console.error("[CALL] Could not play relay audio:", err);
      }
    };

    const handleRelayVideoFrame = ({ callId: relayCallId, frame }) => {
      if (relayCallId !== callId || !frame || connectionStateRef.current === "connected") return;

      setRemoteRelayFrame(frame);
      setRelayMode(true);
    };

    const handleSocketReconnect = () => {
      setStatusText("Signal restored");

      joinCall(callId)
        .then((joinResult) => {
          roleRef.current = joinResult.role;

          sendSignal("call:media-state", {
            callId,
            mediaState: mediaStateRef.current,
          });

          if (joinResult.role === "caller" && joinResult.participantCount > 1) {
            return createOffer({
              force: true,
              iceRestart: true,
            });
          }

          return null;
        })
        .catch(() => {
          setError("Signal reconnected, but the call could not be restored.");
        });
    };

    const handleSocketDisconnect = () => {
      setStatusText("Signal reconnecting");
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("call:ice-candidate", {
          callId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.onicecandidateerror = () => {
      if (shouldPreferSocketRelay()) {
        startMediaRelay(localStreamRef.current, "Relay active");
      }
    };

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        const alreadyAdded = nextRemoteStream
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id);

        if (!alreadyAdded) nextRemoteStream.addTrack(track);
      });

      setRemoteStream(new MediaStream(nextRemoteStream.getTracks()));
      setStatusText("Connected");
    };

    peerConnection.onconnectionstatechange = () => {
      connectionStateRef.current = peerConnection.connectionState;

      if (peerConnection.connectionState === "connected") {
        setStatusText("Connected");
        setError("");
        stopMediaRelay();
        setRemoteRelayFrame("");
      }

      if (peerConnection.connectionState === "connecting") {
        setStatusText("Connecting");
      }

      if (peerConnection.connectionState === "disconnected") {
        setStatusText("Reconnecting");
        startMediaRelay(localStreamRef.current, "Relay active");
      }

      if (peerConnection.connectionState === "failed") {
        setStatusText("Repairing");
        startMediaRelay(localStreamRef.current, "Relay active");

        if (roleRef.current === "caller") {
          createOffer({
            force: true,
            iceRestart: true,
          }).catch(() => {
            setError("Call connection failed. Reopen the call if it does not recover.");
          });
        }
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === "checking") setStatusText("Finding route");

      if (peerConnection.iceConnectionState === "connected") {
        setStatusText("Connected");
        setError("");
      }

      if (peerConnection.iceConnectionState === "disconnected") {
        setStatusText("Reconnecting");
      }
    };

    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:media-state", handleRemoteMediaState);
    socket.on("call:relay-audio", handleRelayAudio);
    socket.on("call:relay-video-frame", handleRelayVideoFrame);
    socket.on("connect", handleSocketReconnect);
    socket.on("disconnect", handleSocketDisconnect);

    const startCall = async () => {
      try {
        setIsConnecting(true);

        let localStream;

        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: audioCall ? false : true,
            audio: audioConstraints,
          });
        } catch (mediaError) {
          if (audioCall) throw mediaError;

          localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: audioConstraints,
          });
        }

        if (cancelled) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = localStream;
        setLocalPreviewStream(localStream);

        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (audioTrack) {
          audioTrack.enabled = authUser.micEnabled !== false;
          audioTrack.onended = () => publishMediaState({ mic: false });
        }

        if (videoTrack) {
          cameraTrackRef.current = videoTrack;
          videoTrack.enabled = !audioCall && authUser.cameraEnabled !== false;
          videoTrack.onended = () => publishMediaState({ camera: false });
        }

        const initialMediaState = {
          mic: authUser.micEnabled !== false,
          camera: Boolean(videoTrack && !audioCall && authUser.cameraEnabled !== false),
          screen: false,
        };

        mediaStateRef.current = initialMediaState;
        setMediaState(initialMediaState);

        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        const joinResult = await joinCall(callId);

        roleRef.current = joinResult.role;
        setStatusText(joinResult.role === "caller" ? "Waiting" : "Joining");

        publishMediaState(initialMediaState);

        if (joinResult.role === "caller" && joinResult.participantCount > 1) {
          await createOffer({ force: true });
        }

        if (shouldPreferSocketRelay()) {
          startMediaRelay(localStream, "Relay active");
        } else {
          relayFallbackTimer = window.setTimeout(() => {
            if (peerConnection.connectionState !== "connected") {
              startMediaRelay(localStream, "Relay active");
            }
          }, 9000);
        }
      } catch (err) {
        console.error("[CALL] Could not join call:", err);
        setError(getMediaErrorMessage(err));
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    };

    startCall();

    return () => {
      cancelled = true;

      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:media-state", handleRemoteMediaState);
      socket.off("call:relay-audio", handleRelayAudio);
      socket.off("call:relay-video-frame", handleRelayVideoFrame);
      socket.off("connect", handleSocketReconnect);
      socket.off("disconnect", handleSocketDisconnect);

      if (relayFallbackTimer) window.clearTimeout(relayFallbackTimer);

      stopMediaRelay();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());

      peerConnection.close();
    };
  }, [
    authUser?._id,
    authUser?.cameraEnabled,
    authUser?.micEnabled,
    audioCall,
    callId,
    canUseCall,
    joinCall,
    publishMediaState,
    sendSignal,
    socket,
    startMediaRelay,
    stopMediaRelay,
  ]);

  const toggleMic = () => {
    primeCallAudio();

    const nextMicState = !mediaState.mic;

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextMicState;
    });

    publishMediaState({ mic: nextMicState });
  };

  const toggleCamera = async () => {
    primeCallAudio();

    if (screenTrackRef.current) {
      const nextCameraState = !mediaState.camera;

      if (nextCameraState) {
        try {
          if (!cameraTrackRef.current || cameraTrackRef.current.readyState !== "live") {
            const cameraStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });

            const cameraTrack = cameraStream.getVideoTracks()[0];

            if (!cameraTrack) throw new Error("Camera track not available");

            cameraTrackRef.current = cameraTrack;
            localStreamRef.current?.addTrack(cameraTrack);
          }

          cameraTrackRef.current.enabled = true;
          publishMediaState({ camera: true });
        } catch {
          toast.error("Camera is not available");
          publishMediaState({ camera: false });
        }

        return;
      }

      if (cameraTrackRef.current) {
        cameraTrackRef.current.stop();
        localStreamRef.current?.removeTrack(cameraTrackRef.current);
        cameraTrackRef.current = null;
      }

      publishMediaState({ camera: false });
      return;
    }

    const nextCameraState = !mediaState.camera;

    if (!nextCameraState) {
      if (cameraTrackRef.current) {
        cameraTrackRef.current.stop();
        localStreamRef.current?.removeTrack(cameraTrackRef.current);
        cameraTrackRef.current = null;
      }

      await replaceOrAddVideoTrack(null, null);

      setLocalPreviewStream(new MediaStream(localStreamRef.current?.getTracks() || []));

      publishMediaState({ camera: false });

      if (floating) setExpanded(false);

      return;
    }

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      const cameraTrack = cameraStream.getVideoTracks()[0];

      if (!cameraTrack) throw new Error("Camera track not available");

      cameraTrackRef.current = cameraTrack;
      cameraTrack.onended = () => publishMediaState({ camera: false });

      localStreamRef.current?.addTrack(cameraTrack);

      await replaceOrAddVideoTrack(cameraTrack, localStreamRef.current);

      setLocalPreviewStream(new MediaStream(localStreamRef.current?.getTracks() || [cameraTrack]));

      publishMediaState({ camera: true });
    } catch (err) {
      console.error("[CALL] Camera unavailable:", err);
      toast.error("Camera is not available");
      publishMediaState({ camera: false });
    }
  };

  const stopScreenShare = useCallback(async () => {
    const screenTrack = screenTrackRef.current;

    if (!screenTrack) return;

    screenTrack.onended = null;
    screenTrack.stop();

    screenTrackRef.current = null;

    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    const cameraTrack = cameraTrackRef.current;

    if (mediaStateRef.current.camera && cameraTrack && cameraTrack.readyState === "live") {
      await replaceOrAddVideoTrack(cameraTrack, localStreamRef.current);
      setLocalPreviewStream(new MediaStream(localStreamRef.current?.getTracks() || [cameraTrack]));
    } else {
      await replaceOrAddVideoTrack(null, null);
      setLocalPreviewStream(new MediaStream(localStreamRef.current?.getTracks() || []));
    }

    publishMediaState({ screen: false });

    if (floating) {
      setExpanded(false);
    }
  }, [floating, publishMediaState, replaceOrAddVideoTrack]);

  const startScreenShare = async () => {
    try {
      if (screenTrackRef.current) {
        await stopScreenShare();
        return;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const displayTrack = displayStream.getVideoTracks()[0];

      if (!displayTrack) {
        displayStream.getTracks().forEach((track) => track.stop());
        toast.error("Screen share is not available");
        return;
      }

      screenStreamRef.current = displayStream;
      screenTrackRef.current = displayTrack;

      displayTrack.onended = () => {
        stopScreenShare();
      };

      await replaceOrAddVideoTrack(displayTrack, displayStream);

      setLocalPreviewStream(displayStream);

      publishMediaState({
        screen: true,
        camera: mediaStateRef.current.camera,
      });

      setExpanded(true);
    } catch (err) {
      console.error("[CALL] Could not share screen:", err);
      toast.error("Screen share was cancelled or blocked");
    }
  };

  const testCallSound = () => {
    primeCallAudio();
    playCallSound("test");
    toast.success("Call sound is working");
  };

  const leaveCall = () => {
    endCall("left call");
  };

  const handleMiniDragStart = (event) => {
    event.preventDefault();

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: miniPosition.x,
      y: miniPosition.y,
    };

    const handleMove = (moveEvent) => {
      if (!dragRef.current) return;

      const nextX = dragRef.current.x + (moveEvent.clientX - dragRef.current.startX);
      const nextY = dragRef.current.y + (moveEvent.clientY - dragRef.current.startY);

      const width = Math.min(390, window.innerWidth - 24);

      setMiniPosition({
        x: Math.min(Math.max(12, nextX), window.innerWidth - width - 12),
        y: Math.min(Math.max(12, nextY), window.innerHeight - 250),
      });
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  if (isLoading || isConnecting) return floating ? null : <PageLoader />;

  if (!canUseCall) {
    if (floating) return null;

    return (
      <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">No active call</h1>
          <p className="text-white/55">Start a call from chat and answer it from the other user.</p>

          <Link to="/" className="btn btn-primary">
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  const roundControls = (
    <>
      <RoundControl active={mediaState.mic} onClick={toggleMic} label="Mute">
        {mediaState.mic ? <MicIcon className="size-5" /> : <MicOffIcon className="size-5" />}
      </RoundControl>

      <RoundControl active={mediaState.camera} onClick={toggleCamera} label="Video">
        {mediaState.camera ? <VideoIcon className="size-5" /> : <VideoOffIcon className="size-5" />}
      </RoundControl>

      <RoundControl active={mediaState.screen} onClick={startScreenShare} label="Share screen">
        {mediaState.screen ? <ScreenShareOffIcon className="size-5" /> : <ScreenShareIcon className="size-5" />}
      </RoundControl>

      <RoundControl active={false} onClick={testCallSound} label="Test sound">
        <Volume2Icon className="size-5" />
      </RoundControl>

      <RoundControl danger onClick={leaveCall} label="End call">
        <PhoneOffIcon className="size-5" />
      </RoundControl>
    </>
  );

  if (floating && !expanded) {
    const showVideoMini =
      mediaState.camera ||
      remoteMediaState.camera ||
      mediaState.screen ||
      remoteMediaState.screen;

    return (
      <>
        <video ref={relayVideoElementRef} autoPlay playsInline muted className="sr-only" />

        <div
          className="fixed z-[9999] w-[390px] max-w-[calc(100vw-24px)]"
          style={{
            left: miniPosition.x,
            top: miniPosition.y,
          }}
        >
          {showVideoMini ? (
            <VideoMiniBar
              peer={peer}
              elapsedSeconds={elapsedSeconds}
              statusText={statusText}
              remoteStream={remoteStream}
              remoteRelayFrame={remoteRelayFrame}
              remoteMediaState={remoteMediaState}
              mediaState={mediaState}
              onDragStart={handleMiniDragStart}
              onExpand={() => setExpanded(true)}
              onToggleCamera={toggleCamera}
              onToggleMic={toggleMic}
              onEnd={leaveCall}
            />
          ) : (
            <AudioMiniBar
              peer={peer}
              elapsedSeconds={elapsedSeconds}
              statusText={statusText}
              mediaState={mediaState}
              remoteMediaState={remoteMediaState}
              onDragStart={handleMiniDragStart}
              onExpand={() => setExpanded(true)}
              onToggleCamera={toggleCamera}
              onToggleMic={toggleMic}
              onEnd={leaveCall}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className={`${floating ? "fixed inset-0 z-[9998]" : "min-h-screen"} bg-[#06070a] text-white flex flex-col`}>
      <video ref={relayVideoElementRef} autoPlay playsInline muted className="sr-only" />

      <header className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <div className="size-10 overflow-hidden rounded-full bg-white/10 shrink-0">
            {peer?.profilePic ? (
              <img
                src={peer.profilePic}
                alt={peer?.fullName || "Friend"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-sm font-semibold">
                {(peer?.fullName || "F").slice(0, 1)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate font-semibold">{peer?.fullName || "Friend"}</h1>

            <p className="truncate text-xs text-white/50">
              {formatDuration(elapsedSeconds)} • {statusText}
              {relayMode ? " • relay" : ""}
              {socketStatus !== "connected" ? " • signal reconnecting" : ""}
            </p>
          </div>
        </div>

        {floating && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="size-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/15"
            aria-label="Minimize call"
          >
            <Minimize2Icon className="size-5" />
          </button>
        )}
      </header>

      {error && (
        <div className="mx-4 sm:mx-6 mb-3 rounded-2xl bg-red-500/15 border border-red-400/20 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <main className="relative flex-1 px-3 sm:px-6 pb-24 overflow-hidden">
        {audioCall && !mediaState.camera && !mediaState.screen && !remoteMediaState.camera && !remoteMediaState.screen ? (
          <div className="h-full w-full rounded-[2rem] bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/10 grid place-items-center p-8">
            <div className="text-center space-y-5">
              <div className="mx-auto size-28 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
                {peer?.profilePic ? (
                  <img
                    src={peer.profilePic}
                    alt={peer?.fullName || "Friend"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-4xl font-bold text-white/70">
                    {(peer?.fullName || "F").slice(0, 1)}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-semibold">{peer?.fullName || "Friend"}</h2>
                <p className="text-sm text-white/55">
                  {formatDuration(elapsedSeconds)} • {statusText}
                </p>
              </div>

              <Waveform active={mediaState.mic && remoteMediaState.mic} />
            </div>
          </div>
        ) : screenActive ? (
          <div className="relative h-full">
            <VideoView
              label={remoteMediaState.screen ? `${peer?.fullName || "Friend"} screen` : "Your screen"}
              stream={remoteMediaState.screen ? remoteStream : localPreviewStream}
              relayFrame={remoteMediaState.screen ? remoteRelayFrame : ""}
              muted={!remoteMediaState.screen}
              isMuted={remoteMediaState.screen ? !remoteMediaState.mic : !mediaState.mic}
              cameraOff={false}
              isScreen
              placeholder="Screen share is starting"
            />

            <div className="absolute bottom-4 right-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-32 w-44 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-xl">
                <VideoView
                  label="You"
                  stream={new MediaStream(
                    localStreamRef.current?.getVideoTracks().filter((track) => track.readyState === "live") || []
                  )}
                  muted
                  isMuted={!mediaState.mic}
                  cameraOff={!mediaState.camera}
                  placeholder="Your camera"
                />
              </div>

              <div className="h-32 w-44 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-xl">
                <VideoView
                  label={peer?.fullName || "Friend"}
                  stream={remoteStream}
                  relayFrame={remoteRelayFrame}
                  isMuted={!remoteMediaState.mic}
                  cameraOff={!remoteMediaState.camera}
                  placeholder="Friend camera"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            <VideoView
              label={peer?.fullName || "Friend"}
              stream={remoteStream}
              relayFrame={remoteRelayFrame}
              isMuted={!remoteMediaState.mic}
              cameraOff={!remoteMediaState.camera}
              placeholder="Waiting for the other user"
            />

            <div className="absolute bottom-4 right-4 h-40 w-56 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-xl">
              <VideoView
                label="You"
                stream={localPreviewStream}
                muted
                isMuted={!mediaState.mic}
                cameraOff={!mediaState.camera}
                placeholder="Your camera"
              />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-5 left-1/2 z-[9999] -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/45 px-4 py-3 shadow-2xl backdrop-blur-xl">
          {roundControls}
        </div>
      </footer>
    </div>
  );
}