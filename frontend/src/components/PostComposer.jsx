import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircleIcon,
  FileTextIcon,
  FilmIcon,
  ImageIcon,
  LoaderIcon,
  SendIcon,
  SquareStackIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { LANGUAGES } from "../constants";
import { fileToDataUrl, makeLocalAvatar } from "../lib/utils";
import MusicPicker from "./MusicPicker.jsx";

const MAX_TEXT_LENGTH = 1200;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_VIDEO_SIZE = 35 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 4 * 1024 * 1024;
const MAX_MEDIA_ITEMS = 10;

function formatFileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function isVideoFile(file) {
  return Boolean(file?.type?.startsWith("video/"));
}

function isImageFile(file) {
  return Boolean(file?.type?.startsWith("image/"));
}

function getLanguageValue(value) {
  return String(value || "english").toLowerCase();
}

function makeClientId(prefix = "post") {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${random}`;
}

function ComposerNotice({ type = "info", children }) {
  const className =
    type === "error"
      ? "border-error/25 bg-error/10 text-error"
      : type === "warning"
      ? "border-warning/25 bg-warning/10 text-warning"
      : "border-base-300 bg-base-200/55 text-base-content/55";

  return (
    <div className={`rounded-2xl border px-3 py-2 text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <AlertCircleIcon className="size-3.5 shrink-0" />
        <span>{children}</span>
      </div>
    </div>
  );
}

function MediaPreview({ items = [], thumbnailPreview, onRemove, onRemoveAll, onRemoveThumbnail }) {
  if (!items.length) return null;

  const firstItem = items[0];
  const video = isVideoFile(firstItem.file);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-base-300 bg-black">
        {video ? (
          <video
            src={firstItem.preview}
            controls
            playsInline
            className="max-h-[26rem] w-full object-contain"
          />
        ) : (
          <img
            src={firstItem.preview}
            alt="Post preview"
            className="max-h-[26rem] w-full object-cover"
          />
        )}

        <button
          type="button"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75"
          onClick={onRemoveAll}
          aria-label="Remove all media"
        >
          <XIcon className="size-4" />
        </button>

        <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur-md">
          {items.length > 1 ? `${items.length} items` : video ? "Video" : "Image"} - {formatFileSize(firstItem.file.size)}
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-base-300 bg-black"
            >
              {isVideoFile(item.file) ? (
                <video
                  src={item.preview}
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={item.preview}
                  alt={`Post media ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              )}

              <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                {index + 1}
              </span>

              <button
                type="button"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove media ${index + 1}`}
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {thumbnailPreview && (
        <div className="relative overflow-hidden rounded-[1.1rem] border border-base-300 bg-base-200">
          <img
            src={thumbnailPreview}
            alt="Thumbnail preview"
            className="h-32 w-full object-cover"
          />

          <button
            type="button"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75"
            onClick={onRemoveThumbnail}
            aria-label="Remove thumbnail"
          >
            <XIcon className="size-4" />
          </button>

          <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur-md">
            Thumbnail
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostComposer({
  authUser,
  onPost,
  isPending,
  autoFocus = false,
}) {
  const mediaInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const languageTouchedRef = useRef(false);

  const [text, setText] = useState("");
  const [language, setLanguage] = useState(
    getLanguageValue(authUser?.learningLanguage)
  );
  const [mediaItems, setMediaItems] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!authUser?.learningLanguage || languageTouchedRef.current) return;
    setLanguage(getLanguageValue(authUser.learningLanguage));
  }, [authUser?.learningLanguage]);

  const avatarSrc = useMemo(() => {
    return (
      authUser?.profilePic ||
      makeLocalAvatar(authUser?.fullName || authUser?.username || "User")
    );
  }, [authUser?.profilePic, authUser?.fullName, authUser?.username]);

  const trimmedText = text.trim();
  const primaryMediaItem = mediaItems[0] || null;
  const mediaIsVideo = isVideoFile(primaryMediaItem?.file);
  const hasMedia = mediaItems.length > 0;
  const remaining = MAX_TEXT_LENGTH - text.length;

  const clearMedia = () => {
    setMediaItems([]);
    setThumbnailFile(null);
    setThumbnailPreview(null);

    if (mediaInputRef.current) mediaInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const removeMediaItem = (itemId) => {
    const removingPrimary = mediaItems[0]?.id === itemId;
    setMediaItems((items) => {
      const nextItems = items.filter((item) => item.id !== itemId);
      return nextItems;
    });
    if (removingPrimary) clearThumbnail();
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);

    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const handleMediaChange = async (event) => {
    const files = Array.from(event.target.files || []);
    setLocalError("");

    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_MEDIA_ITEMS - mediaItems.length);
    const filesToAdd = files.slice(0, availableSlots);

    if (!availableSlots) {
      const message = `Posts can have up to ${MAX_MEDIA_ITEMS} media items.`;
      setLocalError(message);
      toast.error(message);
      event.target.value = "";
      return;
    }

    const nextItems = [];

    for (const file of filesToAdd) {
      const validType = isImageFile(file) || isVideoFile(file);

      if (!validType) {
        setLocalError("Upload image or video files.");
        toast.error("Upload image or video files");
        event.target.value = "";
        return;
      }

      const maxSize = isVideoFile(file) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

      if (file.size > maxSize) {
        const message = `${isVideoFile(file) ? "Video" : "Image"} must be under ${formatFileSize(maxSize)}.`;
        setLocalError(message);
        toast.error(message);
        event.target.value = "";
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        nextItems.push({ id, file, preview: dataUrl });
      } catch {
        setLocalError("Could not preview one of those files.");
        toast.error("Could not preview one of those files");
        event.target.value = "";
        return;
      }
    }

    if (files.length > availableSlots) {
      toast.error(`Only ${availableSlots} more media item${availableSlots === 1 ? "" : "s"} can be added`);
    }

    if (nextItems.length > 0) {
      setMediaItems((items) => [...items, ...nextItems].slice(0, MAX_MEDIA_ITEMS));
      if (!isVideoFile(mediaItems[0]?.file || nextItems[0]?.file)) clearThumbnail();
    }

    event.target.value = "";
  };

  const handleThumbnailChange = async (event) => {
    const file = event.target.files?.[0];
    setLocalError("");

    if (!file) return;

    if (!mediaIsVideo) {
      setLocalError("Thumbnails are only used for video posts.");
      toast.error("Add a video before choosing a thumbnail");
      event.target.value = "";
      return;
    }

    if (!isImageFile(file)) {
      setLocalError("Thumbnail must be an image.");
      toast.error("Thumbnail must be an image");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      const message = `Thumbnail must be under ${formatFileSize(MAX_THUMBNAIL_SIZE)}.`;
      setLocalError(message);
      toast.error(message);
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);

      setThumbnailFile(file);
      setThumbnailPreview(dataUrl);
    } catch {
      setLocalError("Could not preview that thumbnail.");
      toast.error("Could not preview that thumbnail");
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (isPending) return;

    if (!hasMedia) {
      setLocalError("Posts need a photo or video.");
      toast.error("Posts need a photo or video");
      return;
    }

    if (!language) {
      setLocalError("Choose a language for this post.");
      toast.error("Choose a language");
      return;
    }

    try {
      await onPost({
        clientId: makeClientId("post"),
        text: trimmedText,
        language,
        mediaDataUrl: primaryMediaItem?.preview,
        mediaName: primaryMediaItem?.file?.name,
        mediaType: primaryMediaItem?.file?.type,
        mediaItems: mediaItems.map((item, index) => ({
          dataUrl: item.preview,
          name: item.file?.name,
          type: item.file?.type,
          order: index,
        })),
        thumbnailDataUrl: mediaIsVideo ? thumbnailPreview : null,
        thumbnailName: mediaIsVideo ? thumbnailFile?.name : null,
        song: selectedSong,
      });

      setText("");
      setSelectedSong(null);
      clearMedia();
      setLocalError("");
    } catch {
      setLocalError("Could not publish this post.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.6rem] border border-base-300 bg-base-100 p-4 shadow-sm"
    >
      <div className="flex gap-3">
        <div className="size-10 shrink-0 overflow-hidden rounded-full bg-base-300">
          <img
            src={avatarSrc}
            alt={authUser?.fullName || "User"}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            className="min-h-32 w-full resize-none rounded-2xl border border-base-300 bg-base-200/45 px-4 py-3 text-base leading-relaxed outline-none transition placeholder:text-base-content/35 focus:border-primary/40 focus:bg-base-100"
            value={text}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a caption..."
            autoFocus={autoFocus}
            disabled={isPending}
          />

          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-base-content/45">
              {authUser?.emailVerified === false
                ? "Verify your email before posting"
                : hasMedia
                  ? "Ready to post"
                  : "Add a photo or video to post"}
            </span>

            <span
              className={
                remaining < 80 ? "text-warning" : "text-base-content/40"
              }
            >
              {text.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {localError && <ComposerNotice type="error">{localError}</ComposerNotice>}

        <MediaPreview
          items={mediaItems}
          thumbnailPreview={thumbnailPreview}
          onRemove={removeMediaItem}
          onRemoveAll={clearMedia}
          onRemoveThumbnail={clearThumbnail}
        />

        <MusicPicker
          selectedSong={selectedSong}
          onSelect={setSelectedSong}
          disabled={isPending}
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="post-language">
            Post language
          </label>

          <select
            id="post-language"
            className="h-9 rounded-full border border-base-300 bg-base-100 px-3 text-sm outline-none transition focus:border-primary/40"
            value={language}
            onChange={(event) => {
              languageTouchedRef.current = true;
              setLanguage(event.target.value);
            }}
            disabled={isPending}
            required
          >
            {LANGUAGES.map((item) => (
              <option key={item} value={item.toLowerCase()}>
                {item}
              </option>
            ))}
          </select>

          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-sm text-base-content/60 transition hover:bg-base-200 hover:text-base-content">
            {hasMedia ? (
              mediaIsVideo ? (
                <FilmIcon className="size-4" />
              ) : (
                <ImageIcon className="size-4" />
              )
            ) : (
              <ImageIcon className="size-4" />
            )}
            <span>{hasMedia ? "Add more" : "Media"}</span>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleMediaChange}
              disabled={isPending}
            />
          </label>

          <label
            className={[
              "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm transition",
              mediaIsVideo
                ? "cursor-pointer text-base-content/60 hover:bg-base-200 hover:text-base-content"
                : "cursor-not-allowed text-base-content/25",
            ].join(" ")}
            title={
              mediaIsVideo
                ? "Choose video thumbnail"
                : "Thumbnails are only for video posts"
            }
          >
            <SquareStackIcon className="size-4" />
            <span>Thumbnail</span>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
              disabled={isPending || !mediaIsVideo}
            />
          </label>

          {hasMedia && (
            <div className="hidden items-center gap-1 rounded-full bg-base-200 px-3 py-1 text-xs text-base-content/45 sm:flex">
              <FileTextIcon className="size-3.5" />
              <span className="max-w-[10rem] truncate">
                {mediaItems.length === 1
                  ? primaryMediaItem?.file?.name
                  : `${mediaItems.length} media items`}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-content transition hover:bg-primary/90 disabled:opacity-50"
            disabled={isPending || !hasMedia}
          >
            {isPending ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Posting
              </>
            ) : (
              <>
                <SendIcon className="size-4" />
                Post
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
