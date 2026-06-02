import { createElement, useEffect, useRef } from "react";
import {
  AlertCircleIcon,
  FileTextIcon,
  ImageIcon,
  XIcon,
} from "lucide-react";

import PostCard from "./PostCard";

function normalizeMedia(media) {
  if (!media) return null;

  if (Array.isArray(media)) return media[0] || null;

  if (typeof media === "string") {
    return {
      url: media,
      kind: "image",
    };
  }

  const url =
    media.url ||
    media.src ||
    media.imageUrl ||
    media.videoUrl ||
    media.mediaUrl ||
    "";

  const rawKind = String(
    media.kind || media.type || media.mimeType || media.contentType || ""
  ).toLowerCase();

  const kind =
    rawKind.includes("video") || /\.(mp4|webm|mov|m4v)$/i.test(url)
      ? "video"
      : "image";

  if (!url) return null;

  return {
    ...media,
    url,
    kind,
  };
}

function EmptyMediaPanel({ title, description, icon: Icon = FileTextIcon }) {
  return (
    <div className="flex h-full min-h-[18rem] w-full items-center justify-center bg-base-200 p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-base-100 shadow-sm">
          {createElement(Icon, { className: "size-7 text-base-content/40" })}
        </div>

        <p className="mt-4 text-lg font-semibold tracking-tight">{title}</p>

        {description && (
          <p className="mt-1 text-sm leading-6 text-base-content/50">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailMedia({ media }) {
  const normalizedMedia = normalizeMedia(media);

  if (!normalizedMedia) {
    return (
      <EmptyMediaPanel
        title="No media"
        description="This post is text-only, so the conversation is shown directly."
        icon={FileTextIcon}
      />
    );
  }

  if (normalizedMedia.kind === "video") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <video
          src={normalizedMedia.url}
          controls
          playsInline
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <img
        src={normalizedMedia.url}
        alt={normalizedMedia.alt || "Post media"}
        className="max-h-full max-w-full object-contain"
        loading="eager"
      />
    </div>
  );
}

export default function PostDetailDrawer({ post, onClose, ...postActions }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!post) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [post, onClose]);

  if (!post) return null;

  const displayPost = post.repostOf || post;
  const unavailable = Boolean(displayPost.unavailable);
  const media = normalizeMedia(displayPost.media);
  const hasMedia = Boolean(media);

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 p-0 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Post details"
      onMouseDown={handleBackdropMouseDown}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className="fixed right-4 top-4 z-20 grid size-10 place-items-center rounded-full bg-black/45 text-white shadow-xl backdrop-blur-xl transition hover:bg-black/65 focus:outline-none focus:ring-2 focus:ring-white/40"
        onClick={onClose}
        aria-label="Close post details"
      >
        <XIcon className="size-5" />
      </button>

      {unavailable ? (
        <section className="mx-auto flex h-[100dvh] w-full items-center justify-center sm:h-[90vh] sm:max-w-xl">
          <div className="w-full overflow-hidden bg-base-100 shadow-2xl sm:rounded-[2rem]">
            <EmptyMediaPanel
              title="Original post unavailable"
              description="It may have been deleted, archived, or hidden by privacy settings."
              icon={AlertCircleIcon}
            />
          </div>
        </section>
      ) : hasMedia ? (
        <section className="mx-auto grid h-[100dvh] w-full overflow-hidden bg-base-100 shadow-2xl sm:h-[90vh] sm:max-w-6xl sm:rounded-[2rem] lg:grid-cols-[minmax(0,1.2fr)_28rem]">
          <div className="min-h-0 h-[42dvh] border-b border-base-300 bg-black lg:h-full lg:border-b-0">
            <DetailMedia media={media} />
          </div>

          <aside className="min-h-0 overflow-y-auto bg-base-100 lg:border-l lg:border-base-300">
            <div className="mx-auto max-w-xl lg:max-w-none">
              <PostCard post={post} expanded hideMedia {...postActions} />
            </div>
          </aside>
        </section>
      ) : (
        <section className="mx-auto h-[100dvh] w-full overflow-hidden bg-base-100 shadow-2xl sm:h-[90vh] sm:max-w-2xl sm:rounded-[2rem]">
          <div className="flex items-center gap-2 border-b border-base-300 px-4 py-3">
            <div className="grid size-9 place-items-center rounded-full bg-base-200 text-base-content/50">
              <ImageIcon className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">Post details</p>
              <p className="text-xs text-base-content/45">
                Text post and conversation
              </p>
            </div>
          </div>

          <aside className="h-[calc(100%-4rem)] overflow-y-auto">
            <div className="mx-auto max-w-xl">
              <PostCard post={post} expanded {...postActions} />
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
