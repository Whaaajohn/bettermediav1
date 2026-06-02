import { useEffect, useRef, useState } from "react";
import { Music2Icon, PauseIcon, PlayIcon } from "lucide-react";

const GLOBAL_AUDIO_KEY = "__bettermediaSongPreview";

function getGlobalAudio() {
  if (typeof window === "undefined") return null;
  if (!window[GLOBAL_AUDIO_KEY]) {
    window[GLOBAL_AUDIO_KEY] = {
      audio: new Audio(),
      songKey: "",
      listeners: new Set(),
    };
  }
  return window[GLOBAL_AUDIO_KEY];
}

function emitAudioState() {
  const controller = getGlobalAudio();
  if (!controller) return;
  controller.listeners.forEach((listener) => listener());
}

function songKey(song) {
  return `${song?.provider || ""}:${song?.providerId || ""}:${song?.previewUrl || ""}`;
}

export function stopSongPreview() {
  const controller = getGlobalAudio();
  if (!controller) return;
  controller.audio.pause();
  controller.songKey = "";
  emitAudioState();
}

export default function PostSongPreview({ song, compact = false, onClear }) {
  const [, forceRender] = useState(0);
  const progressRef = useRef(null);

  useEffect(() => {
    const controller = getGlobalAudio();
    if (!controller) return undefined;

    const update = () => {
      const audio = controller.audio;
      if (progressRef.current) {
        const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
        progressRef.current.style.width = `${Math.max(0, Math.min(ratio, 1)) * 100}%`;
      }
      forceRender((value) => value + 1);
    };

    controller.listeners.add(update);
    controller.audio.addEventListener("timeupdate", update);
    controller.audio.addEventListener("pause", update);
    controller.audio.addEventListener("play", update);
    controller.audio.addEventListener("ended", stopSongPreview);

    return () => {
      controller.listeners.delete(update);
      controller.audio.removeEventListener("timeupdate", update);
      controller.audio.removeEventListener("pause", update);
      controller.audio.removeEventListener("play", update);
      controller.audio.removeEventListener("ended", stopSongPreview);
    };
  }, []);

  if (!song?.previewUrl) return null;

  const controller = getGlobalAudio();
  const key = songKey(song);
  const active = controller?.songKey === key && !controller.audio.paused;

  const toggle = (event) => {
    event?.stopPropagation?.();
    const nextController = getGlobalAudio();
    if (!nextController) return;

    if (nextController.songKey !== key) {
      nextController.audio.pause();
      nextController.audio.src = song.previewUrl;
      nextController.audio.currentTime = 0;
      nextController.songKey = key;
    }

    if (nextController.audio.paused) {
      nextController.audio.play().catch(() => null);
    } else {
      nextController.audio.pause();
    }
    emitAudioState();
  };

  return (
    <div
      className={[
        "group overflow-hidden rounded-xl border border-base-300/70 bg-base-200/35",
        compact ? "p-1.5" : "p-2",
      ].join(" ")}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-base-content text-base-100 shadow-sm transition hover:scale-105"
          onClick={toggle}
          aria-label={active ? "Pause preview" : "Play preview"}
        >
          {active ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </button>

        <div className="size-8 shrink-0 overflow-hidden rounded-lg bg-base-300">
          {song.artworkUrl ? (
            <img
              src={song.artworkUrl}
              alt={song.album || song.title || "Song artwork"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <Music2Icon className="size-3.5 text-base-content/40" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-4">
            {song.title}
          </p>
          <p className="truncate text-[0.7rem] text-base-content/50">
            {song.artist}
            {song.album ? ` - ${song.album}` : ""}
          </p>
          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-base-300">
            <div ref={progressRef} className="h-full w-0 rounded-full bg-primary" />
          </div>
        </div>

        <span className="hidden rounded-full bg-base-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-base-content/40 sm:inline">
          {song.provider || "music"}
        </span>

        {onClear && (
          <button
            type="button"
            className="rounded-full px-2 py-1 text-xs font-semibold text-base-content/45 transition hover:bg-base-300 hover:text-base-content"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
