import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderIcon,
  LockIcon,
  PlusCircleIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuthUser from "../hooks/useAuthUser";
import { createPost } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import PostComposer from "./PostComposer";

const MIN_TEXT_LENGTH = 1;

function getTextValue(payload) {
  return String(
    payload?.text ||
      payload?.content ||
      payload?.body ||
      payload?.caption ||
      payload?.message ||
      ""
  ).trim();
}

function hasRealMedia(payload) {
  const mediaFields = [
    payload?.image,
    payload?.imageUrl,
    payload?.media,
    payload?.mediaItems,
    payload?.mediaDataUrl,
    payload?.mediaUrl,
    payload?.attachment,
    payload?.attachments,
    payload?.photos,
    payload?.video,
    payload?.videoUrl,
  ];

  return mediaFields.some((value) => {
    if (!value) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  });
}

function hasBannerOnly(payload) {
  const hasBanner =
    Boolean(payload?.banner) ||
    Boolean(payload?.bannerUrl) ||
    Boolean(payload?.bannerImage) ||
    Boolean(payload?.cover) ||
    Boolean(payload?.coverImage);

  if (!hasBanner) return false;

  const text = getTextValue(payload);
  const media = hasRealMedia(payload);

  return text.length < MIN_TEXT_LENGTH && !media;
}

function isValidPostPayload(payload) {
  const media = hasRealMedia(payload);

  return media;
}

function updateFeedPosts(oldData, updater) {
  if (!oldData) return oldData;
  if (Array.isArray(oldData)) return updater(oldData);
  const posts = oldData.posts || oldData.items;
  if (!Array.isArray(posts)) return oldData;
  const nextPosts = updater(posts);
  return oldData.posts ? { ...oldData, posts: nextPosts } : { ...oldData, items: nextPosts };
}

function optimisticPostFromPayload(payload, authUser) {
  const createdAt = new Date().toISOString();
  const clientId = payload.clientId || `post-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rawMediaItems = Array.isArray(payload.mediaItems) && payload.mediaItems.length > 0
    ? payload.mediaItems
    : payload.mediaDataUrl
      ? [{ dataUrl: payload.mediaDataUrl, type: payload.mediaType, name: payload.mediaName }]
      : [];
  const mediaItems = rawMediaItems.map((item, index) => {
    const url = item.dataUrl || item.mediaDataUrl || item.preview || item.url || "";
    const type = item.type || item.mimeType || "";
    const kind = type.startsWith("video/") ? "video" : "image";

    return {
      url,
      kind,
      mimeType: type,
      name: item.name,
      order: index,
    };
  }).filter((item) => item.url);
  const primaryMedia = mediaItems[0] || null;
  const mediaKind = primaryMedia?.kind || (payload.mediaType?.startsWith("video/") ? "video" : "image");

  return {
    _id: clientId,
    clientId,
    text: getTextValue(payload),
    content: getTextValue(payload),
    caption: getTextValue(payload),
    author: authUser,
    media: primaryMedia,
    mediaItems,
    thumbnail: payload.thumbnailDataUrl || primaryMedia?.url || null,
    mediaType: mediaKind,
    language: payload.language || authUser?.learningLanguage || "english",
    song: payload.song || null,
    audioLabel: payload.song ? "" : mediaItems.some((item) => item.kind === "video") ? "Original audio" : "",
    hashtags: [],
    comments: [],
    likes: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    shareCount: 0,
    isMine: true,
    status: "posting",
    optimistic: true,
    createdAt,
    updatedAt: createdAt,
  };
}

function SoftNotice({ type = "info", icon: Icon, children }) {
  const styles =
    type === "error"
      ? "border-error/20 bg-error/5 text-error"
      : type === "warning"
      ? "border-warning/20 bg-warning/5 text-warning"
      : "border-base-300 bg-base-200/50 text-base-content/55";

  return (
    <div className={`rounded-2xl border px-3 py-2.5 text-sm ${styles}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0" />}
        <span>{children}</span>
      </div>
    </div>
  );
}

export default function CreatePostModal({
  triggerClassName = "btn btn-primary rounded-xl",
  triggerLabel = "Post",
  showLabel = true,
}) {
  const dialogRef = useRef(null);
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const [composerKey, setComposerKey] = useState(0);
  const [localError, setLocalError] = useState("");

  const isVerified = authUser?.emailVerified !== false;

  const canOpenComposer = useMemo(() => {
    return Boolean(authUser?._id && !authUser?.activeBan);
  }, [authUser?._id, authUser?.activeBan]);

  const openModal = () => {
    setLocalError("");

    if (!authUser?._id) {
      toast.error("Sign in before creating a post");
      return;
    }

    if (authUser?.activeBan) {
      toast.error("Your account is restricted from posting");
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    dialog.showModal();
  };

  const closeModal = () => {
    if (isPending) return;

    setLocalError("");
    dialogRef.current?.close();
  };

  const { mutateAsync: createPostMutation, isPending } = useMutation({
    mutationFn: createPost,
    onMutate: async (payload) => {
      const optimisticPost = optimisticPostFromPayload(payload, authUser);
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData) =>
        updateFeedPosts(oldData, (posts) => [optimisticPost, ...posts])
      );
      return { optimisticPost };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });

      if (authUser?._id) {
        queryClient.invalidateQueries({
          queryKey: ["profilePosts", authUser._id],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      toast.success("Post published");
      setComposerKey((value) => value + 1);
      setLocalError("");
      dialogRef.current?.close();
    },
    onError: (error, variables) => {
      const message = getApiErrorMessage(error, "Could not publish post");
      const failedClientId = variables?.clientId;
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData) =>
        updateFeedPosts(oldData, (posts) =>
          posts.map((post) =>
            post.clientId && post.clientId === failedClientId
              ? { ...post, status: "failed", optimistic: true, failedReason: message }
              : post
          )
        )
      );
      setLocalError(message);
      toast.error(message);
    },
  });

  const handlePost = async (payload) => {
    setLocalError("");

    if (!authUser?._id) {
      setLocalError("Sign in before creating a post.");
      toast.error("Sign in before creating a post");
      return;
    }

    if (authUser?.activeBan) {
      setLocalError("Your account is restricted from posting.");
      toast.error("Your account is restricted from posting");
      return;
    }

    if (!isVerified) {
      setLocalError("Verify your email before publishing posts.");
      toast.error("Verify your email before posting");
      return;
    }

    if (!payload || typeof payload !== "object") {
      setLocalError("Could not read this post. Try again.");
      toast.error("Could not read this post");
      return;
    }

    if (hasBannerOnly(payload)) {
      setLocalError("Add text or real media before posting a banner.");
      toast.error("Add text or media before posting a banner");
      return;
    }

    if (!isValidPostPayload(payload)) {
      setLocalError("Posts need a photo or video.");
      toast.error("Posts need a photo or video");
      return;
    }

    await createPostMutation(payload);
  };

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={openModal}
        aria-label="Create post"
        disabled={!canOpenComposer}
        title={
          !authUser?._id
            ? "Sign in to post"
            : authUser?.activeBan
            ? "Account restricted"
            : "Create post"
        }
      >
        <PlusCircleIcon className="size-5" />
        {showLabel && <span>{triggerLabel}</span>}
      </button>

      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onCancel={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <div className="modal-box relative w-[min(50rem,calc(100vw-1rem))] max-w-4xl overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-0 shadow-2xl">
          <header className="relative border-b border-base-300 px-5 py-4">
            <div className="text-center">
              <h2 className="text-base font-semibold">Create post</h2>
              <p className="mt-0.5 text-xs text-base-content/45">
                Share a photo or video with your community
              </p>
            </div>

            <button
              type="button"
              className="absolute right-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-base-content/55 hover:bg-base-200 hover:text-base-content"
              onClick={closeModal}
              disabled={isPending}
              aria-label="Close create post"
            >
              <XIcon className="size-4" />
            </button>
          </header>

          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-5 sm:px-7">
            <div className="mx-auto max-w-3xl space-y-4">
              {!isVerified && (
                <SoftNotice type="warning" icon={LockIcon}>
                  Verify your email before publishing posts.
                </SoftNotice>
              )}

              {authUser?.activeBan && (
                <SoftNotice type="error" icon={AlertCircleIcon}>
                  Your account is currently restricted from posting.
                </SoftNotice>
              )}

              {localError && (
                <SoftNotice type="error" icon={AlertCircleIcon}>
                  {localError}
                </SoftNotice>
              )}

              <PostComposer
                key={composerKey}
                authUser={authUser}
                onPost={handlePost}
                isPending={isPending}
                autoFocus
              />

              <div className="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-200/40 px-3 py-2 text-xs text-base-content/45">
                <CheckCircle2Icon className="size-4 shrink-0" />
                New posts need a photo or video. Captions and songs are optional.
              </div>
            </div>
          </div>

          {isPending && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-base-100/55 backdrop-blur-md">
              <div className="flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm shadow-xl">
                <LoaderIcon className="size-4 animate-spin" />
                Publishing...
              </div>
            </div>
          )}
        </div>

        <form method="dialog" className="modal-backdrop">
          <button disabled={isPending}>close</button>
        </form>
      </dialog>
    </>
  );
}
