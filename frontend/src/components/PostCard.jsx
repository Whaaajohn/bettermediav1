import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  EyeOffIcon,
  FlagIcon,
  HeartIcon,
  ImageIcon,
  LoaderIcon,
  LockKeyholeIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PinIcon,
  PencilIcon,
  PlayIcon,
  Repeat2Icon,
  SearchIcon,
  SendIcon,
  Share2Icon,
  SmilePlusIcon,
  SparklesIcon,
  SquareStackIcon,
  Trash2Icon,
  VideoIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import UserBadges from "./UserBadges";
import PostSongPreview from "./PostSongPreview.jsx";
import { createAppeal, getFollowers, searchGifs, sharePost } from "../lib/api";
import { getLanguageFlag, makeLocalAvatar } from "../lib/utils";
import { getApiErrorMessage } from "../lib/errors";
import { promptReport } from "../lib/reports";

function stop(event) {
  event.stopPropagation();
}

function safeCapitalize(value) {
  const text = String(value || "");
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = date.toDateString() === now.toDateString();

  if (today) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getUserAvatar(user) {
  return (
    user?.profilePic ||
    makeLocalAvatar(user?.fullName || user?.username || "User")
  );
}

function getCommentId(comment) {
  return String(comment?._id || comment?.id || "");
}

function getCommentParentId(comment) {
  const value =
    comment?.parentId ||
    comment?.parentCommentId ||
    comment?.replyTo ||
    comment?.replyToId ||
    comment?.parent?._id ||
    comment?.parent?.id ||
    null;

  return value ? String(value) : null;
}

function getCommentRootId(comment) {
  const value =
    comment?.rootId ||
    comment?.rootCommentId ||
    comment?.threadId ||
    comment?.root?._id ||
    comment?.root?.id ||
    null;

  return value ? String(value) : null;
}

function getCommentSortScore(comment) {
  return (
    Number(comment?.likeCount || comment?.likes?.length || 0) * 3 +
    Number(comment?.replyCount || countAllComments(comment?.replies || []) || 0) * 2
  );
}

function sortCommentsByRank(items = []) {
  return [...items].sort((a, b) => {
    const pinnedDelta = new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0);
    if (pinnedDelta !== 0) return pinnedDelta;

    const scoreDelta = getCommentSortScore(b) - getCommentSortScore(a);
    if (scoreDelta !== 0) return scoreDelta;

    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function buildCommentTree(rawComments = []) {
  const flat = [];
  const seen = new Set();

  function walk(list, fallbackParentId = null, fallbackRootId = null) {
    if (!Array.isArray(list)) return;

    list.forEach((comment, index) => {
      if (comment?.deletedAt) return;
      const id = getCommentId(comment);
      if (!id || seen.has(id)) return;

      seen.add(id);

      const explicitParentId = getCommentParentId(comment);
      const parentId = explicitParentId || fallbackParentId || null;
      const rootId =
        getCommentRootId(comment) ||
        fallbackRootId ||
        (parentId ? fallbackRootId : id) ||
        id;

      flat.push({
        ...comment,
        _id: id,
        replies: [],
        __parentId: parentId,
        __rootId: rootId,
        __order: flat.length + index,
      });

      if (Array.isArray(comment.replies) && comment.replies.length > 0) {
        walk(comment.replies, id, rootId || id);
      }
    });
  }

  walk(rawComments);

  const map = new Map();
  flat.forEach((comment) => map.set(comment._id, comment));

  const roots = [];

  flat.forEach((comment) => {
    if (comment.__parentId && map.has(comment.__parentId)) {
      map.get(comment.__parentId).replies.push(comment);
    } else {
      roots.push(comment);
    }
  });

  function sortTree(comments) {
    const sorted = sortCommentsByRank(comments);

    sorted.forEach((comment) => {
      comment.replies = sortTree(comment.replies || []);
    });

    return sorted;
  }

  return sortTree(roots);
}

function flattenReplies(comment, depth = 1, output = []) {
  const replies = Array.isArray(comment?.replies) ? comment.replies : [];

  replies.forEach((reply) => {
    output.push({
      comment: reply,
      depth,
      replyToAuthor: reply.parentAuthor || comment.author,
    });

    flattenReplies(reply, depth + 1, output);
  });

  return output;
}

function countAllComments(commentTree = []) {
  return commentTree.reduce(
    (total, comment) =>
      comment?.deletedAt
        ? total
        : total + 1 + countAllComments(comment.replies || []),
    0
  );
}

function normalizeGifItem(gif) {
  if (!gif) return null;
  const url = gif.url || gif.previewUrl || gif.images?.fixed_height?.url || "";
  if (!url) return null;

  return {
    id: gif.id || url,
    title: gif.title || "GIF",
    url,
    source: gif.source || "klipy",
    type: gif.type || "gif",
  };
}

function normalizeMedia(media) {
  if (!media) return null;

  if (Array.isArray(media)) return normalizeMedia(media[0]);
  if (typeof media === "string") return { url: media, kind: "image" };

  const url =
    media.url ||
    media.src ||
    media.imageUrl ||
    media.videoUrl ||
    media.mediaUrl ||
    "";

  if (!url) return null;

  const rawKind = String(
    media.kind || media.type || media.mimeType || media.contentType || ""
  ).toLowerCase();

  const kind =
    rawKind.includes("video") || /\.(mp4|webm|mov|m4v)$/i.test(url)
      ? "video"
      : "image";

  return {
    ...media,
    url,
    kind,
  };
}

function normalizeMediaItems(mediaItems, fallbackMedia) {
  const rawItems =
    Array.isArray(mediaItems) && mediaItems.length > 0
      ? mediaItems
      : [fallbackMedia].filter(Boolean);

  return rawItems
    .map(normalizeMedia)
    .filter(Boolean)
    .map((item, index) => ({
      ...item,
      __key: item.url || item.filename || `${item.kind}-${index}`,
    }));
}

function getAudioLabel(post, mediaItems = []) {
  if (post?.song?.title) {
    return [post.song.title, post.song.artist].filter(Boolean).join(" - ");
  }

  if (post?.audioLabel) return post.audioLabel;

  return mediaItems.some((item) => ["video", "audio"].includes(item.kind))
    ? "Original audio"
    : "";
}

function PostMediaCarousel({ mediaItems = [], thumbnail, compact = false }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const thumbnailUrl =
    typeof thumbnail === "string"
      ? thumbnail
      : thumbnail?.url || thumbnail?.src || thumbnail?.imageUrl || "";
  const itemCount = mediaItems.length;
  const activeItem = mediaItems[Math.min(activeIndex, Math.max(itemCount - 1, 0))];

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(itemCount - 1, 0)));
  }, [itemCount]);

  useEffect(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, [activeItem?.__key]);

  useEffect(() => {
    if (compact || !frameRef.current || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.35) {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.35, 0.75] }
    );

    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [compact]);

  if (!activeItem) {
    if (thumbnailUrl) {
      return (
        <img
          src={thumbnailUrl}
          alt="Post thumbnail"
          className={
            compact
              ? "h-full w-full object-cover"
              : "max-h-[34rem] w-full bg-black object-contain"
          }
        />
      );
    }

    if (!compact) return null;

    return (
      <div className="grid aspect-square w-full place-items-center bg-base-200">
        <MessageCircleIcon className="size-9 text-base-content/35" />
      </div>
    );
  }

  const className = compact
    ? "h-full w-full object-cover"
    : "max-h-[42rem] w-full bg-black object-contain";

  if (compact && thumbnailUrl) {
    return <img src={thumbnailUrl} alt="Post thumbnail" className={className} />;
  }

  if (compact) {
    if (activeItem.kind === "video") {
      return (
        <video
          src={activeItem.url}
          muted
          playsInline
          preload="metadata"
          className={className}
        />
      );
    }

    return (
      <img
        src={activeItem.url}
        alt={activeItem.alt || "Post media"}
        className={className}
        loading="lazy"
      />
    );
  }

  const goTo = (nextIndex) => {
    setActiveIndex((index) => {
      const value = typeof nextIndex === "function" ? nextIndex(index) : nextIndex;
      return (value + itemCount) % itemCount;
    });
  };

  const toggleVideo = async (event) => {
    stop(event);
    const video = videoRef.current;
    if (!video || activeItem.kind !== "video") return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setMuted(true);
        video.muted = true;
        await video.play().catch(() => null);
      }
    } else {
      video.pause();
    }
  };

  return (
    <div
      ref={frameRef}
      className="group relative overflow-hidden rounded-xl bg-black"
      onClick={(event) => event.stopPropagation()}
    >
      {activeItem.kind === "video" ? (
        <>
          <video
            ref={videoRef}
            src={activeItem.url}
            poster={thumbnailUrl || undefined}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            className={className}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          <button
            type="button"
            className="absolute inset-0 grid place-items-center text-white"
            onClick={toggleVideo}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {!isPlaying && (
              <span className="grid size-20 place-items-center rounded-full bg-white/88 text-black shadow-2xl backdrop-blur-sm transition group-hover:scale-105">
                <PlayIcon className="ml-1 size-10 fill-current" strokeWidth={1.5} />
              </span>
            )}
          </button>

          {isPlaying && (
            <button
              type="button"
              className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition hover:bg-black/65 group-hover:opacity-100"
              onClick={toggleVideo}
              aria-label="Pause video"
            >
              <PauseIcon className="size-4" />
            </button>
          )}

          <button
            type="button"
            className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
            onClick={(event) => {
              stop(event);
              setMuted((value) => !value);
            }}
            aria-label={muted ? "Unmute video" : "Mute video"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeXIcon className="size-4" /> : <Volume2Icon className="size-4" />}
          </button>
        </>
      ) : (
        <img
          src={activeItem.url}
          alt={activeItem.alt || "Post media"}
          className={className}
          loading="eager"
        />
      )}

      {itemCount > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
            onClick={(event) => {
              stop(event);
              goTo((index) => index - 1);
            }}
            aria-label="Previous media"
          >
            <ChevronLeftIcon className="size-5" />
          </button>

          <button
            type="button"
            className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow-lg backdrop-blur transition hover:bg-white"
            onClick={(event) => {
              stop(event);
              goTo((index) => index + 1);
            }}
            aria-label="Next media"
          >
            <ChevronRightIcon className="size-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {mediaItems.map((item, index) => (
              <button
                key={item.__key}
                type="button"
                className={[
                  "h-1.5 rounded-full transition",
                  index === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/55",
                ].join(" ")}
                onClick={(event) => {
                  stop(event);
                  goTo(index);
                }}
                aria-label={`Show media ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {itemCount > 1 && (
        <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          {activeIndex + 1}/{itemCount}
        </div>
      )}
    </div>
  );
}

function SmallActionButton({ active, danger, onClick, icon: Icon, label, count }) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-semibold transition",
        danger
          ? "text-error hover:bg-error/10"
          : active
            ? "text-primary hover:bg-primary/10"
            : "text-base-content/80 hover:bg-base-200 hover:text-base-content",
      ].join(" ")}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon
        className={[
          "size-6",
          active && Icon === HeartIcon ? "fill-current" : "",
        ].join(" ")}
      />
      {typeof count === "number" && <span>{count}</span>}
    </button>
  );
}

function EditHistoryDetails({ history = [] }) {
  if (!history.length) return null;

  return (
    <details className="text-xs text-base-content/45" onClick={stop}>
      <summary className="cursor-pointer rounded-full px-2 py-1 hover:bg-base-200 hover:text-base-content">
        edited
      </summary>

      <div className="mt-2 space-y-2 rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm">
        {history.slice(-3).map((edit, index) => (
          <div key={`${edit.editedAt || index}-${index}`} className="space-y-1">
            <p>
              <span className="font-semibold">Before:</span>{" "}
              {edit.previousText || "Empty"}
            </p>
            <p>
              <span className="font-semibold">After:</span>{" "}
              {edit.nextText || "Empty"}
            </p>
            <p className="text-base-content/40">{formatDate(edit.editedAt)}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function RichText({ text = "", onHashtagClick }) {
  const parts = String(text).split(/(#[a-zA-Z0-9_]{2,40})/g);

  return (
    <p className="whitespace-pre-wrap text-[0.95rem] leading-6 text-base-content/85">
      {parts.map((part, index) => {
        if (/^#[a-zA-Z0-9_]{2,40}$/.test(part)) {
          const tag = part.slice(1).toLowerCase();

          return (
            <Link
              key={`${part}-${index}`}
              to={`/hashtag/${tag}`}
              className="font-semibold text-primary hover:underline"
              onClick={(event) => {
                stop(event);
                onHashtagClick?.(tag);
              }}
            >
              {part}
            </Link>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </p>
  );
}

function PostMenu({
  displayPost,
  onArchive,
  onDeletePost,
  onHidePost,
  onMuteFirstHashtag,
  onNotInterested,
  onPinPost,
  onReport,
  onSeeMoreLikeThis,
}) {
  return (
    <div className="dropdown dropdown-end" onClick={stop}>
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
        tabIndex={0}
        aria-label="Post options"
      >
        <MoreHorizontalIcon className="size-5" />
      </button>

      <ul
        tabIndex={0}
        className="dropdown-content menu z-30 mt-2 w-52 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-2xl"
      >
        <li>
          <button type="button" onClick={onReport}>
            <FlagIcon className="size-4" />
            Report
          </button>
        </li>

        {onNotInterested && (
          <li>
            <button type="button" onClick={onNotInterested}>
              <EyeOffIcon className="size-4" />
              Not interested
            </button>
          </li>
        )}

        {onSeeMoreLikeThis && (
          <li>
            <button type="button" onClick={onSeeMoreLikeThis}>
              <SparklesIcon className="size-4" />
              See more like this
            </button>
          </li>
        )}

        {onHidePost && (
          <li>
            <button type="button" onClick={onHidePost}>
              <XIcon className="size-4" />
              Hide post
            </button>
          </li>
        )}

        {displayPost.hashtags?.[0] && onMuteFirstHashtag && (
          <li>
            <button type="button" onClick={onMuteFirstHashtag}>
              <VolumeXIcon className="size-4" />
              Mute #{displayPost.hashtags[0]}
            </button>
          </li>
        )}

        {displayPost.isMine && onPinPost && !displayPost.repostOf && (
          <li>
            <button type="button" onClick={() => onPinPost?.(displayPost._id)}>
              <PinIcon className="size-4" />
              {displayPost.pinnedAt ? "Unpin from profile" : "Pin to profile"}
            </button>
          </li>
        )}

        {displayPost.isMine && (
          <li>
            <button type="button" onClick={() => onArchive?.(displayPost._id)}>
              <ArchiveIcon className="size-4" />
              {displayPost.archived ? "Unarchive" : "Archive"}
            </button>
          </li>
        )}

        {displayPost.isMine && (
          <li>
            <button
              type="button"
              className="text-error"
              onClick={() => onDeletePost?.(displayPost._id)}
            >
              <Trash2Icon className="size-4" />
              Delete post
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

function CommentActions({
  comment,
  displayPost,
  isMine,
  canDelete,
  editing,
  canPin,
  onCommentLike,
  onDeleteComment,
  onToggleCommentPin,
  onStartEdit,
  onReport,
  onShowReply,
}) {
  const reportComment = async () => {
    const report = await promptReport("comment", comment._id);
    if (report) onReport?.(report);
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-base-content/45">
      <button
        type="button"
        className="inline-flex items-center gap-1 transition hover:text-base-content"
        onClick={() => onCommentLike?.(displayPost._id, comment._id)}
      >
        <HeartIcon
          className={`size-3.5 ${
            comment.isLiked ? "fill-current text-error" : ""
          }`}
        />
        {comment.likeCount || 0}
      </button>

      <button
        type="button"
        className="transition hover:text-base-content"
        onClick={onShowReply}
      >
        Reply
      </button>

      {comment.editedAt && <EditHistoryDetails history={comment.editHistory || []} />}

      {canPin && (
        <button
          type="button"
          className="inline-flex items-center gap-1 transition hover:text-base-content"
          onClick={() => onToggleCommentPin?.(displayPost._id, comment._id)}
        >
          <PinIcon className="size-3.5" />
          {comment.pinnedAt ? "Unpin" : "Pin"}
        </button>
      )}

      {isMine && !editing && (
        <button
          type="button"
          className="inline-flex items-center gap-1 transition hover:text-base-content"
          onClick={onStartEdit}
        >
          <PencilIcon className="size-3.5" />
          Edit
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-error transition hover:text-error/75"
          onClick={() => onDeleteComment?.(displayPost._id, comment._id)}
        >
          <Trash2Icon className="size-3.5" />
          Delete
        </button>
      )}

      <button
        type="button"
        className="inline-flex items-center gap-1 transition hover:text-base-content"
        onClick={reportComment}
      >
        <FlagIcon className="size-3.5" />
        Report
      </button>
    </div>
  );
}

function CommentGifPreview({ gif, onRemove }) {
  const normalized = normalizeGifItem(gif);
  if (!normalized) return null;

  return (
    <div className="mt-1.5 w-fit max-w-full overflow-hidden rounded-lg border border-base-300 bg-base-100">
      <div className="relative">
        <img
          src={normalized.url}
          alt={normalized.title || "GIF"}
          className="max-h-32 max-w-[14rem] object-cover"
          loading="lazy"
        />

        {onRemove && (
          <button
            type="button"
            className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60 text-white"
            onClick={onRemove}
            aria-label="Remove GIF"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InlineGifPicker({ open, query, onQueryChange, results, isLoading, onPick }) {
  if (!open) return null;

  return (
    <div className="mt-2 rounded-xl border border-base-300 bg-base-100 p-2 shadow-sm">
      <label className="input input-bordered input-sm flex h-9 items-center gap-2 rounded-xl bg-base-100">
        <SearchIcon className="size-3.5 text-base-content/35" />
        <input
          className="grow text-sm"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search GIFs"
        />
      </label>

      <div className="mt-2 grid max-h-36 grid-cols-4 gap-1.5 overflow-y-auto">
        {query.trim().length <= 1 ? (
          <p className="col-span-4 px-2 py-4 text-center text-xs text-base-content/45">
            Search KLIPY reactions.
          </p>
        ) : isLoading ? (
          <div className="col-span-4 grid place-items-center py-5">
            <LoaderIcon className="size-4 animate-spin text-base-content/45" />
          </div>
        ) : results.length === 0 ? (
          <p className="col-span-4 px-2 py-4 text-center text-xs text-base-content/45">
            No GIFs found.
          </p>
        ) : (
          results.map((gif) => {
            const normalized = normalizeGifItem(gif);
            if (!normalized) return null;

            return (
              <button
                key={normalized.id}
                type="button"
                className="aspect-square overflow-hidden rounded-lg bg-base-200 transition hover:opacity-80"
                onClick={() => onPick(normalized)}
                title={normalized.title}
              >
                <img
                  src={normalized.url}
                  alt={normalized.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReplyComposer({ author, value, gif, onGifChange, onChange, onCancel, onSubmit }) {
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const { data: gifResults = [], isLoading: loadingGifs } = useQuery({
    queryKey: ["comment-gifs", gifQuery],
    queryFn: () => searchGifs(gifQuery),
    enabled: gifOpen && gifQuery.trim().length > 1,
    staleTime: 60_000,
  });

  return (
    <form
      className="mt-2 rounded-2xl border border-base-300/80 bg-base-100 p-2.5 shadow-sm"
      onSubmit={onSubmit}
    >
      <p className="mb-2 px-1 text-[0.72rem] font-semibold text-primary">
        Replying to @{author?.username || "user"}
      </p>

      <div className="flex items-center gap-2">
        <input
          className="input input-bordered input-sm flex-1 rounded-full bg-base-100/80"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Reply to ${author?.username || "comment"}`}
          maxLength={800}
          autoFocus
        />

        <button
          type="button"
          className="grid size-8 place-items-center rounded-full text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
          onClick={() => setGifOpen((value) => !value)}
          aria-label="Add GIF"
        >
          <SmilePlusIcon className="size-4" />
        </button>

        <button
          type="button"
          className="grid size-8 place-items-center rounded-full text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
          onClick={onCancel}
          aria-label="Cancel reply"
        >
          <XIcon className="size-4" />
        </button>

        <button
          type="submit"
          className="grid size-8 place-items-center rounded-full bg-primary text-primary-content transition hover:bg-primary/90 disabled:opacity-50"
          aria-label="Send reply"
          disabled={!value.trim() && !gif?.url}
        >
          <SendIcon className="size-4" />
        </button>
      </div>

      <InlineGifPicker
        open={gifOpen}
        query={gifQuery}
        onQueryChange={setGifQuery}
        results={gifResults.map(normalizeGifItem).filter(Boolean)}
        isLoading={loadingGifs}
        onPick={(pickedGif) => {
          onGifChange?.(pickedGif);
          setGifOpen(false);
          setGifQuery("");
        }}
      />

      <CommentGifPreview gif={gif} onRemove={() => onGifChange?.(null)} />
    </form>
  );
}

function CommentBubble({
  comment,
  currentUser,
  displayPost,
  depth = 0,
  replyToAuthor,
  onDeleteComment,
  onEditComment,
  onCommentLike,
  onToggleCommentPin,
  onReply,
  onReport,
}) {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [replyGif, setReplyGif] = useState(null);
  const [showReply, setShowReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");

  useEffect(() => {
    setEditText(comment.text || "");
  }, [comment.text]);

  const isMine = comment.author?._id === currentUser?._id;
  const isStaff =
    currentUser?.isStaff || currentUser?.isAdmin || currentUser?.role === "mod";

  const deleted = Boolean(comment.deletedAt);
  const underReview = Boolean(comment.isUnderReview || comment.botHidden);
  const canFightReview = Boolean(underReview && isMine && comment.botReviewActionId);
  const canDelete = isMine || displayPost.isMine || isStaff;
  const canPin = Boolean(
    depth === 0 &&
      (displayPost.author?._id === currentUser?._id || isStaff) &&
      !deleted
  );
  const author = comment.author || {};
  const authorAvatar = getUserAvatar(author);
  const visualDepth = Math.min(depth, 2);
  const fightReviewMutation = useMutation({
    mutationFn: () =>
      createAppeal({
        text: "Please review this comment moderation action. I believe this comment should be restored.",
        botActionId: comment.botReviewActionId,
        targetType: "comment",
        targetId: comment._id,
      }),
    onSuccess: (result) => {
      const status = result?.status || result?.appeal?.status;
      toast.success(status === "approved" ? "Comment restored after review." : "Appeal sent for review.");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not send appeal"));
    },
  });

  if (deleted) return null;

  const submitEdit = () => {
    const clean = editText.trim();

    if (!clean || clean === comment.text) {
      setEditing(false);
      setEditText(comment.text || "");
      return;
    }

    onEditComment?.(displayPost._id, comment._id, clean);
    setEditing(false);
  };

  const submitReply = (event) => {
    event.preventDefault();

    const clean = replyText.trim();
    if (!clean && !replyGif?.url) return;

    onReply?.(displayPost._id, comment._id, { text: clean, gif: replyGif });
    setReplyText("");
    setReplyGif(null);
    setShowReply(false);
  };

  return (
    <div
      className={[
        "relative transition-all",
        depth > 0 ? "border-l border-base-300/60 pl-3" : "",
      ].join(" ")}
      style={
        depth > 0
          ? {
              marginLeft: `${visualDepth * 0.65}rem`,
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <Link
          to={author._id ? `/profile/${author._id}` : "#"}
          className="shrink-0"
          onClick={stop}
        >
          <div
            className={`overflow-hidden rounded-full bg-base-300 ring-1 ring-base-300 ${
              depth > 0 ? "size-7" : "size-8"
            }`}
          >
            <img
              src={authorAvatar}
              alt={author.fullName || "User"}
              className="h-full w-full object-cover"
            />
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div>
            <div className="flex min-w-0 items-center gap-1.5">
              <Link
                to={author._id ? `/profile/${author._id}` : "#"}
                className="truncate text-sm font-bold leading-5 hover:underline"
                onClick={stop}
              >
                {author.username || author.fullName || "user"}
              </Link>

              <UserBadges badges={author.badges || []} compact />

              <span className="ml-auto shrink-0 text-[0.68rem] font-medium text-base-content/35">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {(comment.pinnedAt || comment.creatorLiked) && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {comment.pinnedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.66rem] font-bold text-primary">
                    <PinIcon className="size-3" />
                    Pinned by creator
                  </span>
                )}

                {comment.creatorLiked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-1.5 py-0.5 text-[0.66rem] font-bold text-error">
                    <HeartIcon className="size-3 fill-current" />
                    Creator liked
                  </span>
                )}
              </div>
            )}

            {underReview && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 px-2 py-1.5 text-[0.72rem] font-semibold text-warning">
                <EyeOffIcon className="size-3.5" />
                <span>Comment under review</span>
                {canFightReview && (
                  <button
                    type="button"
                    className="ml-auto rounded-full bg-warning/15 px-2 py-0.5 text-warning transition hover:bg-warning/25 disabled:opacity-50"
                    onClick={() => fightReviewMutation.mutate()}
                    disabled={fightReviewMutation.isPending}
                  >
                    Fight this
                  </button>
                )}
              </div>
            )}

            {depth > 0 && replyToAuthor && (
              <p className="mt-1 text-xs font-semibold text-primary/80">
                Replying to @
                {replyToAuthor.username || replyToAuthor.fullName || "user"}
              </p>
            )}

            {editing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full resize-none rounded-xl bg-base-100 text-sm"
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  autoFocus
                  maxLength={800}
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full text-base-content/50 transition hover:bg-base-300 hover:text-base-content"
                    onClick={() => {
                      setEditing(false);
                      setEditText(comment.text || "");
                    }}
                    aria-label="Cancel edit"
                  >
                    <XIcon className="size-4" />
                  </button>

                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full bg-primary text-primary-content transition hover:bg-primary/90"
                    onClick={submitEdit}
                    aria-label="Save edit"
                  >
                    <CheckIcon className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="mt-1 whitespace-pre-wrap text-[0.92rem] leading-6 text-base-content/82"
              >
                {comment.text}
              </p>
            )}

            {!deleted && comment.gif?.url && <CommentGifPreview gif={comment.gif} />}
          </div>

          <CommentActions
            comment={comment}
            displayPost={displayPost}
            isMine={isMine}
            canDelete={canDelete}
            canPin={canPin}
            editing={editing}
            onCommentLike={onCommentLike}
            onDeleteComment={onDeleteComment}
            onToggleCommentPin={onToggleCommentPin}
            onStartEdit={() => setEditing(true)}
            onReport={onReport}
            onShowReply={() => setShowReply((value) => !value)}
          />

          {showReply && (
            <ReplyComposer
              author={author}
              value={replyText}
              gif={replyGif}
              onGifChange={setReplyGif}
              onChange={setReplyText}
              onCancel={() => {
                setReplyText("");
                setReplyGif(null);
                setShowReply(false);
              }}
              onSubmit={submitReply}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  currentUser,
  displayPost,
  onDeleteComment,
  onEditComment,
  onCommentLike,
  onToggleCommentPin,
  onReply,
  onReport,
}) {
  const [showReplies, setShowReplies] = useState(false);
  const flattenedReplies = useMemo(() => flattenReplies(comment), [comment]);
  const replyTotal = flattenedReplies.length;

  return (
    <div className="space-y-1.5">
      <CommentBubble
        comment={comment}
        currentUser={currentUser}
        displayPost={displayPost}
        depth={0}
        onDeleteComment={onDeleteComment}
        onEditComment={onEditComment}
        onCommentLike={onCommentLike}
        onToggleCommentPin={onToggleCommentPin}
        onReply={onReply}
        onReport={onReport}
      />

      {replyTotal > 0 && (
        <button
          type="button"
          className="ml-10 rounded-full px-2 py-0.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
          onClick={() => setShowReplies((value) => !value)}
        >
          {showReplies
            ? `Hide ${replyTotal} ${replyTotal === 1 ? "reply" : "replies"}`
            : `View ${replyTotal} ${replyTotal === 1 ? "reply" : "replies"}`}
        </button>
      )}

      {replyTotal > 0 && showReplies && (
        <div className="space-y-2">
          {flattenedReplies.map(({ comment: reply, depth, replyToAuthor }) => (
            <CommentBubble
              key={reply._id}
              comment={reply}
              currentUser={currentUser}
              displayPost={displayPost}
              depth={depth}
              replyToAuthor={replyToAuthor}
              onDeleteComment={onDeleteComment}
              onEditComment={onEditComment}
              onCommentLike={onCommentLike}
              onToggleCommentPin={onToggleCommentPin}
              onReply={onReply}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SharePostDialog({ open, onClose, currentUser, post }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const postId = post?._id;

  const {
    data: following = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["share-following", currentUser?._id],
    queryFn: () => getFollowers(currentUser._id, "following"),
    enabled: Boolean(open && currentUser?._id),
    retry: false,
  });

  const { mutate: sendShare, isPending } = useMutation({
    mutationFn: () => sharePost(postId, { recipientIds: selectedIds, message }),
    onSuccess: (data) => {
      const sentCount = data?.sentCount || data?.messages?.length || (data?._id ? 1 : 0);
      const failedCount = data?.failedCount || data?.failures?.length || 0;
      setMessage("");
      setQuery("");
      setSelectedIds([]);
      onClose?.();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(
        failedCount > 0
          ? `Sent to ${sentCount}. ${failedCount} could not receive it.`
          : sentCount === 1
            ? "Post sent in chat"
            : `Post sent to ${sentCount} people`
      );
    },
    onError: (shareError) =>
      toast.error(getApiErrorMessage(shareError, "Could not share post")),
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMessage("");
      setSelectedIds([]);
    }
  }, [open]);

  if (!open) return null;

  const filteredUsers = following.filter((user) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [user.fullName, user.username, user.nativeLanguage, user.learningLanguage]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(q));
  });
  const selectedCount = selectedIds.length;

  const toggleSelected = (userId) => {
    setSelectedIds((ids) =>
      ids.includes(userId)
        ? ids.filter((id) => id !== userId)
        : ids.length >= 10
          ? ids
          : [...ids, userId]
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Share post"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className="w-full max-w-sm overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-base-300 px-3 py-2.5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Send post</h2>
            <p className="text-xs text-base-content/45">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : "Pick people you follow."}
            </p>
          </div>

          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="space-y-2.5 p-3">
          <label className="input input-bordered flex h-10 items-center gap-2 rounded-xl bg-base-100">
            <SearchIcon className="size-4 text-base-content/35" />
            <input
              className="grow"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search following"
            />
          </label>

          <textarea
            className="textarea textarea-bordered min-h-16 w-full resize-none rounded-xl bg-base-100 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Add a message, optional"
            maxLength={280}
          />

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="grid place-items-center py-8 text-base-content/45">
                <LoaderIcon className="size-5 animate-spin" />
              </div>
            ) : error ? (
              <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
                Could not load your following list.
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="rounded-2xl bg-base-200/60 px-4 py-3 text-sm text-base-content/55">
                No followed users match that search.
              </p>
            ) : (
              filteredUsers.map((user) => {
                const avatar = getUserAvatar(user);

                return (
                  <button
                    key={user._id}
                    type="button"
                    className={[
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition disabled:opacity-60",
                      selectedIds.includes(user._id)
                        ? "bg-primary/10 text-base-content ring-1 ring-primary/20"
                        : "hover:bg-base-200",
                    ].join(" ")}
                    onClick={() => toggleSelected(user._id)}
                    disabled={isPending}
                  >
                    <img
                      src={avatar}
                      alt={user.fullName || "User"}
                      className="size-9 rounded-full object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">
                          {user.fullName || user.username}
                        </p>
                        <UserBadges badges={user.badges || []} compact />
                      </div>
                      <p className="truncate text-xs text-base-content/45">
                        @{user.username || "user"}
                      </p>
                    </div>

                    {selectedIds.includes(user._id) ? (
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-content">
                        <CheckIcon className="size-3.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <SendIcon className="size-4 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-base-300 pt-2.5">
            <p className="text-xs text-base-content/45">
              Max 10 people. Private posts only send to users who can view them.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-sm rounded-xl"
              onClick={() => sendShare()}
              disabled={isPending || selectedCount === 0}
            >
              {isPending ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PostCard({
  post,
  currentUser,
  compact = false,
  expanded = false,
  hideMedia = false,
  onArchive,
  onDeletePost,
  onDeleteComment,
  onEditComment,
  onCommentLike,
  onFollow,
  onHashtagClick,
  onHidePost,
  onLike,
  onMuteHashtag,
  onNotInterested,
  onOpen,
  onPinPost,
  onReply,
  onRepost,
  onComment,
  onToggleCommentPin,
  onReport,
  onSeeMoreLikeThis,
  onUnfollow,
}) {
  const [commentText, setCommentText] = useState("");
  const [commentGif, setCommentGif] = useState(null);
  const [commentGifOpen, setCommentGifOpen] = useState(false);
  const [commentGifQuery, setCommentGifQuery] = useState("");
  const [showComments, setShowComments] = useState(expanded);
  const [shareOpen, setShareOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (expanded) setShowComments(true);
  }, [expanded]);

  const displayPost = post?.repostOf || post;
  const isRepost = Boolean(post?.repostOf);
  const isUnavailable = Boolean(displayPost?.unavailable);
  const underReview = Boolean(displayPost?.isUnderReview || displayPost?.botHidden);
  const canFightReview = Boolean(underReview && displayPost?.isMine && displayPost?.botReviewActionId);
  const menuPost = isUnavailable ? post : displayPost;
  const { data: commentGifResults = [], isLoading: loadingCommentGifs } = useQuery({
    queryKey: ["comment-gifs", displayPost?._id, commentGifQuery],
    queryFn: () => searchGifs(commentGifQuery),
    enabled: commentGifOpen && commentGifQuery.trim().length > 1,
    staleTime: 60_000,
  });
  const commentTree = useMemo(
    () => buildCommentTree(displayPost?.comments || []),
    [displayPost?.comments]
  );
  const totalCommentCount = displayPost?.commentCount ?? countAllComments(commentTree);
  const author = displayPost?.author || {};
  const authorAvatar = getUserAvatar(author);
  const mediaItems = useMemo(
    () => normalizeMediaItems(displayPost?.mediaItems, displayPost?.media),
    [displayPost?.mediaItems, displayPost?.media]
  );
  const audioLabel = getAudioLabel(displayPost, mediaItems);

  const canFollowAuthor =
    currentUser?._id &&
    author?._id &&
    currentUser._id !== author._id &&
    !isUnavailable;

  const languageLabel = safeCapitalize(displayPost?.language || "language");

  const reportTarget = async (targetType, targetId) => {
    if (!targetId) return;

    const report = await promptReport(targetType, targetId);
    if (report) onReport?.(report);
  };

  const openPost = () => {
    if (!expanded) onOpen?.(post);
  };

  const followAuthor = () => {
    if (!author._id) return;

    if (author.isFollowing) onUnfollow?.(author._id);
    else onFollow?.(author._id);
  };

  const submitComment = (event) => {
    event.preventDefault();

    const clean = commentText.trim();
    if (!clean && !commentGif?.url) return;

    onComment?.(displayPost._id, { text: clean, gif: commentGif });
    setCommentText("");
    setCommentGif(null);
    setCommentGifOpen(false);
    setCommentGifQuery("");
  };

  const fightPostReviewMutation = useMutation({
    mutationFn: () =>
      createAppeal({
        text: "Please review this post moderation action. I believe this post should be restored.",
        botActionId: displayPost.botReviewActionId,
        targetType: "post",
        targetId: displayPost._id,
      }),
    onSuccess: (result) => {
      const status = result?.status || result?.appeal?.status;
      toast.success(status === "approved" ? "Post restored after review." : "Appeal sent for review.");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not send appeal"));
    },
  });

  if (!post || !displayPost) return null;

  if (compact) {
    const normalizedMedia = mediaItems[0] || null;

    return (
      <button
        type="button"
        className="group relative block aspect-square overflow-hidden bg-base-300"
        onClick={() => onOpen?.(post)}
        aria-label="Open post"
      >
        {isUnavailable ? (
          <div className="grid h-full w-full place-items-center bg-base-200 p-4 text-center">
            <div>
              <LockKeyholeIcon className="mx-auto size-8 text-base-content/45" />
              <span className="mt-2 block text-xs font-semibold text-base-content/55">
                Unavailable
              </span>
            </div>
          </div>
        ) : (
          <PostMediaCarousel
            mediaItems={mediaItems}
            thumbnail={displayPost.thumbnail}
            compact
          />
        )}

        <div className="absolute inset-0 flex items-center justify-center gap-5 bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
          <span className="flex items-center gap-1 font-bold">
            <HeartIcon className="size-5 fill-current" />
            {isUnavailable ? 0 : displayPost.likeCount || 0}
          </span>

          <span className="flex items-center gap-1 font-bold">
            <MessageCircleIcon className="size-5 fill-current" />
            {isUnavailable ? 0 : totalCommentCount}
          </span>
        </div>

        <div className="absolute right-2 top-2 flex gap-1 text-white drop-shadow">
          {isRepost && <Repeat2Icon className="size-5" />}
          {!isUnavailable &&
            (normalizedMedia?.kind === "video" ? (
              <VideoIcon className="size-5" />
            ) : mediaItems.length > 1 ? (
              <SquareStackIcon className="size-5" />
            ) : normalizedMedia ? (
              <ImageIcon className="size-5" />
            ) : null)}
        </div>

        {!isUnavailable && displayPost.pinnedAt && (
          <div className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
            <PinIcon className="size-4" />
          </div>
        )}

        {!isUnavailable && underReview && (
          <div className="absolute bottom-2 left-2 rounded-full bg-warning px-2 py-1 text-[0.68rem] font-bold text-warning-content shadow">
            Under review
          </div>
        )}
      </button>
    );
  }

  return (
    <>
    <article
      className={[
        "overflow-hidden border-y border-base-300 bg-base-100 shadow-sm sm:rounded-2xl sm:border",
        onOpen && !expanded
          ? "cursor-pointer transition hover:border-primary/30 hover:shadow-md"
          : "",
      ].join(" ")}
      onClick={openPost}
    >
      {isRepost && (
        <div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-base-content/50">
          <Repeat2Icon className="size-3.5" />

          <Link
            to={`/profile/${post.author?._id}`}
            onClick={stop}
            className="font-medium hover:underline"
          >
            {post.author?.fullName || "Someone"}
          </Link>

          <span>reposted</span>
        </div>
      )}

      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        {isUnavailable ? (
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-base-200">
            <LockKeyholeIcon className="size-5 text-base-content/45" />
          </div>
        ) : (
          <Link
            to={`/profile/${author._id}`}
            className="shrink-0"
            onClick={stop}
          >
            <div className="size-10 overflow-hidden rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-fuchsia-500 p-[2px]">
              <img
                src={authorAvatar}
                alt={author.fullName || "User"}
                className="h-full w-full rounded-full bg-base-300 object-cover"
              />
            </div>
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {isUnavailable ? (
              <span className="truncate font-semibold">
                Original post unavailable
              </span>
            ) : (
              <Link
                to={`/profile/${author._id}`}
                className="truncate font-semibold hover:underline"
                onClick={stop}
              >
                {author.username || author.fullName || "user"}
              </Link>
            )}

            {!isUnavailable && <UserBadges badges={author.badges || []} compact />}

            {!isUnavailable && canFollowAuthor && !expanded && (
              <button
                type="button"
                className="ml-1 text-sm font-semibold text-primary hover:underline"
                onClick={(event) => {
                  stop(event);
                  followAuthor();
                }}
              >
                {author.isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <p className="truncate text-xs text-base-content/45">
            {audioLabel || `${getLanguageFlag(displayPost.language)} ${languageLabel}`}
            {displayPost.createdAt ? ` - ${formatDate(displayPost.createdAt)}` : ""}
          </p>
        </div>

        {displayPost.archived && (
          <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
            Archived
          </span>
        )}

        {!displayPost.archived && displayPost.pinnedAt && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <PinIcon className="size-3.5" />
            Pinned
          </span>
        )}

        <PostMenu
          displayPost={menuPost}
          onArchive={onArchive}
          onDeletePost={onDeletePost}
          onHidePost={() => onHidePost?.(displayPost._id)}
          onMuteFirstHashtag={() => onMuteHashtag?.(displayPost.hashtags?.[0])}
          onNotInterested={() => onNotInterested?.(displayPost._id)}
          onPinPost={onPinPost}
          onReport={() => reportTarget("post", menuPost._id)}
          onSeeMoreLikeThis={() => onSeeMoreLikeThis?.(displayPost)}
        />
      </header>

      {isUnavailable && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/60">
            Original post unavailable because it was archived, private, blocked,
            or deleted. The repost stays visible without leaking the original.
          </div>
        </div>
      )}

      {!isUnavailable && underReview && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
            <EyeOffIcon className="size-4" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Post under review</p>
              <p className="text-xs text-warning/80">
                Only you and staff can see this while ModBot or admins review it.
              </p>
            </div>
            {canFightReview && (
              <button
                type="button"
                className="rounded-full bg-warning px-3 py-1.5 text-xs font-bold text-warning-content transition hover:bg-warning/90 disabled:opacity-50"
                onClick={(event) => {
                  stop(event);
                  fightPostReviewMutation.mutate();
                }}
                disabled={fightPostReviewMutation.isPending}
              >
                Fight this
              </button>
            )}
          </div>
        </div>
      )}

      {!isUnavailable && !hideMedia && (mediaItems.length > 0 || displayPost.thumbnail) && (
        <div className="px-4 pb-2">
          <PostMediaCarousel
            mediaItems={mediaItems}
            thumbnail={displayPost.thumbnail}
          />
        </div>
      )}

      {!isUnavailable && displayPost.song && (
        <div className="px-4 pb-2">
          <PostSongPreview song={displayPost.song} compact />
        </div>
      )}

      {!isUnavailable && ["posting", "sending", "failed"].includes(displayPost.status) && (
        <div className="px-4 pb-3">
          <div
            className={[
              "rounded-2xl border px-3 py-2 text-xs font-semibold",
              displayPost.status === "failed"
                ? "border-error/20 bg-error/5 text-error"
                : "border-info/20 bg-info/5 text-info",
            ].join(" ")}
          >
            {displayPost.status === "failed"
              ? displayPost.failedReason || "Post failed. Try again from the composer."
              : "Posting..."}
          </div>
        </div>
      )}

      {!isUnavailable && (
        <div className="flex items-center gap-1 px-3 py-2" onClick={stop}>
          <SmallActionButton
            icon={HeartIcon}
            label="Like post"
            count={displayPost.likeCount || 0}
            active={displayPost.isLiked}
            danger={displayPost.isLiked}
            onClick={() => onLike?.(displayPost._id)}
          />

          <SmallActionButton
            icon={MessageCircleIcon}
            label="Comments"
            count={totalCommentCount}
            onClick={() => setShowComments((value) => !value)}
          />

          <SmallActionButton
            icon={Repeat2Icon}
            label="Repost"
            count={displayPost.repostCount || 0}
            active={displayPost.isReposted}
            onClick={() => onRepost?.(displayPost._id)}
          />

          <SmallActionButton
            icon={Share2Icon}
            label="Send post"
            count={displayPost.shareCount || 0}
            onClick={() => setShareOpen(true)}
          />

          <button
            type="button"
            className="ml-auto grid size-9 place-items-center rounded-full text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
            onClick={() => setShowComments(true)}
            aria-label="Add comment"
            title="Add comment"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      )}

      {!isUnavailable && displayPost.text && (
        <div className="px-4 pb-3">
          <RichText text={displayPost.text} onHashtagClick={onHashtagClick} />
        </div>
      )}

      {!isUnavailable && showComments && (
        <section
          className="border-t border-base-300 bg-base-100"
          onClick={stop}
        >
          <div className="flex items-center justify-between border-b border-base-300/70 px-4 py-2.5">
            <p className="text-sm font-bold tracking-tight">Comments</p>
            <span className="text-xs font-semibold text-base-content/40">
              {totalCommentCount}
            </span>
          </div>

          <div
            className={[
              "space-y-4 overflow-y-auto overscroll-contain px-4 py-3.5",
              expanded ? "max-h-[min(32rem,62dvh)]" : "max-h-96",
            ].join(" ")}
          >
            {commentTree.length > 0 ? (
              commentTree.map((comment) => (
                <CommentThread
                  key={comment._id}
                  comment={comment}
                  currentUser={currentUser}
                  displayPost={displayPost}
                  onDeleteComment={onDeleteComment}
                  onEditComment={onEditComment}
                  onCommentLike={onCommentLike}
                  onToggleCommentPin={onToggleCommentPin}
                  onReply={onReply}
                  onReport={onReport}
                />
              ))
            ) : (
              <div className="py-8 text-center">
                <MessageCircleIcon className="mx-auto size-8 text-base-content/25" />
                <p className="mt-2 text-sm font-semibold text-base-content/60">
                  No comments yet
                </p>
                <p className="text-xs text-base-content/40">
                  Start the conversation.
                </p>
              </div>
            )}
          </div>

          <form
            className="space-y-2 border-t border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur"
            onSubmit={submitComment}
          >
            <div className="flex items-center gap-2">
              <input
                className="input input-bordered input-sm h-9 flex-1 rounded-full bg-base-100 text-sm"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Add a comment..."
                maxLength={800}
              />

              <button
                type="button"
                className={[
                  "grid size-8 place-items-center rounded-full transition",
                  commentGifOpen
                    ? "bg-primary text-primary-content"
                    : "text-base-content/50 hover:bg-base-200 hover:text-base-content",
                ].join(" ")}
                onClick={() => setCommentGifOpen((value) => !value)}
                aria-label="Add GIF"
              >
                <SmilePlusIcon className="size-4" />
              </button>

              <button
                type="submit"
                className="grid size-8 place-items-center rounded-full bg-primary text-primary-content transition hover:bg-primary/90 disabled:opacity-50"
                aria-label="Send comment"
                disabled={!commentText.trim() && !commentGif?.url}
              >
                <SendIcon className="size-4" />
              </button>
            </div>

            <InlineGifPicker
              open={commentGifOpen}
              query={commentGifQuery}
              onQueryChange={setCommentGifQuery}
              results={commentGifResults.map(normalizeGifItem).filter(Boolean)}
              isLoading={loadingCommentGifs}
              onPick={(pickedGif) => {
                setCommentGif(pickedGif);
                setCommentGifOpen(false);
                setCommentGifQuery("");
              }}
            />

            <CommentGifPreview gif={commentGif} onRemove={() => setCommentGif(null)} />
          </form>
        </section>
      )}
    </article>
    <SharePostDialog
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      currentUser={currentUser}
      post={displayPost}
    />
    </>
  );
}
