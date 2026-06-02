import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  LoaderIcon,
  Music2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { getTrendingMusic, searchMusic } from "../lib/api";
import PostSongPreview, { stopSongPreview } from "./PostSongPreview.jsx";

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function MusicResult({ song, selected, onSelect }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-base-200"
      onClick={() => onSelect(song)}
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-base-300">
        {song.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt={song.album || song.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Music2Icon className="size-4 text-base-content/40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{song.title}</p>
        <p className="truncate text-xs text-base-content/50">
          {song.artist}
          {song.album ? ` - ${song.album}` : ""}
        </p>
      </div>

      {selected ? (
        <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-content">
          <CheckIcon className="size-4" />
        </span>
      ) : (
        <span className="rounded-full border border-base-300 px-2 py-1 text-xs font-semibold text-base-content/45">
          Add
        </span>
      )}
    </button>
  );
}

export default function MusicPicker({ selectedSong, onSelect, disabled = false }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const trimmedQuery = debouncedQuery.trim();

  const searchQuery = useQuery({
    queryKey: ["music", "search", trimmedQuery],
    queryFn: () => searchMusic(trimmedQuery),
    enabled: trimmedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const trendingQuery = useQuery({
    queryKey: ["music", "trending"],
    queryFn: () => getTrendingMusic(12),
    enabled: trimmedQuery.length < 2,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const songs = useMemo(() => {
    const response = trimmedQuery.length >= 2 ? searchQuery.data : trendingQuery.data;
    return Array.isArray(response?.items) ? response.items : [];
  }, [searchQuery.data, trendingQuery.data, trimmedQuery.length]);

  const isLoading = trimmedQuery.length >= 2 ? searchQuery.isLoading : trendingQuery.isLoading;
  const isError = trimmedQuery.length >= 2 ? searchQuery.isError : trendingQuery.isError;

  const open = () => {
    if (disabled) return;
    dialogRef.current?.showModal();
  };

  const close = () => {
    stopSongPreview();
    dialogRef.current?.close();
  };

  return (
    <>
      <div className="space-y-2">
        {selectedSong ? (
          <PostSongPreview
            song={selectedSong}
            onClear={() => {
              stopSongPreview();
              onSelect?.(null);
            }}
          />
        ) : (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm text-base-content/60 transition hover:bg-base-200 hover:text-base-content disabled:opacity-50"
            onClick={open}
            disabled={disabled}
          >
            <Music2Icon className="size-4" />
            Add song
          </button>
        )}

        {selectedSong && (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={open}
            disabled={disabled}
          >
            Change song
          </button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onCancel={() => stopSongPreview()}
      >
        <div className="modal-box w-[min(38rem,calc(100vw-1rem))] max-w-xl rounded-[1.75rem] border border-base-300 bg-base-100 p-0 shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-base-300 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Add song</h3>
              <p className="text-xs text-base-content/45">30 second legal previews only.</p>
            </div>

            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
              onClick={close}
              aria-label="Close music picker"
            >
              <XIcon className="size-4" />
            </button>
          </header>

          <div className="space-y-4 p-5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
              <input
                className="input input-bordered h-11 w-full rounded-2xl bg-base-100 pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search songs or artists"
                autoFocus
              />
            </div>

            <div className="max-h-[26rem] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="grid place-items-center py-12 text-sm text-base-content/45">
                  <LoaderIcon className="mb-2 size-5 animate-spin" />
                  Searching music
                </div>
              ) : isError ? (
                <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-error">
                  Music search is unavailable right now.
                </div>
              ) : songs.length === 0 ? (
                <div className="rounded-2xl border border-base-300 bg-base-200/45 p-5 text-center text-sm text-base-content/50">
                  {trimmedQuery.length >= 2 ? "No songs found." : "Trending songs will show here."}
                </div>
              ) : (
                <div className="space-y-1">
                  {songs.map((song) => (
                    <MusicResult
                      key={`${song.provider}-${song.providerId}`}
                      song={song}
                      selected={
                        selectedSong?.provider === song.provider &&
                        selectedSong?.providerId === song.providerId
                      }
                      onSelect={(pickedSong) => {
                        stopSongPreview();
                        onSelect?.(pickedSong);
                        close();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => stopSongPreview()}>close</button>
        </form>
      </dialog>
    </>
  );
}
