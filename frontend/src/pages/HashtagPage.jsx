import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FlameIcon,
  HashIcon,
  LoaderIcon,
  RefreshCwIcon,
  SparklesIcon,
  TrendingUpIcon,
  VolumeXIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import PostCard from "../components/PostCard.jsx";
import PostDetailDrawer from "../components/PostDetailDrawer.jsx";
import useAuthUser from "../hooks/useAuthUser";
import {
  addComment,
  createReport,
  deleteComment,
  editComment,
  getHashtag,
  muteHashtag,
  recordAlgorithmEvent,
  replyToComment,
  repost,
  toggleCommentLike,
  toggleCommentPin,
  toggleLike,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

function normalizeTag(tag = "") {
  return String(tag)
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function formatCount(value = 0) {
  const number = Number(value || 0);

  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;

  return String(number);
}

function getPostScore(post) {
  const likes = post.likeCount || post.likes?.length || 0;
  const comments = post.commentCount || post.comments?.length || 0;
  const reposts = post.repostCount || post.reposts?.length || 0;

  return likes * 2 + comments * 3 + reposts * 4;
}

function normalizeCommentPayload(input) {
  if (typeof input === "string") return { text: input.trim(), gif: null };
  return {
    text: String(input?.text || "").trim(),
    gif: input?.gif || null,
  };
}

function makeClientId(prefix = "comment") {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${random}`;
}

function usePostMutation(fn, successMessage, fallback, onRefresh) {
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      onRefresh?.(data);
      if (successMessage) toast.success(successMessage);
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, fallback)),
  });
}

function HashtagSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm"
        >
          <div className="flex gap-3">
            <div className="size-11 rounded-full bg-base-300" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded-full bg-base-300" />
              <div className="h-3 w-72 max-w-full rounded-full bg-base-300" />
              <div className="h-24 rounded-2xl bg-base-300" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition",
        active
          ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
          : "text-base-content/50 hover:bg-base-100/70 hover:text-base-content",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function HashtagPage() {
  const { tag = "" } = useParams();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab] = useState("top");

  const cleanTag = normalizeTag(tag);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["hashtag", cleanTag],
    queryFn: () => getHashtag(cleanTag),
    enabled: Boolean(cleanTag),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!cleanTag) return;

    recordAlgorithmEvent({
      type: "hashtag_click",
      hashtag: cleanTag,
    }).catch(() => null);
  }, [cleanTag]);

  const posts = useMemo(() => {
    const rawPosts = Array.isArray(data?.posts) ? data.posts : [];

    if (activeTab === "recent") {
      return [...rawPosts].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    }

    return [...rawPosts].sort((a, b) => {
      const scoreDiff = getPostScore(b) - getPostScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [data?.posts, activeTab]);

  const relatedTags = useMemo(() => {
    return Array.isArray(data?.relatedTags)
      ? data.relatedTags.map(normalizeTag).filter(Boolean).filter((item) => item !== cleanTag)
      : [];
  }, [data?.relatedTags, cleanTag]);

  const currentSelectedPost =
    posts.find((post) => post._id === selectedPost?._id) || selectedPost;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hashtag", cleanTag] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["trendingHashtags"] });
  };

  const syncUpdatedPost = (updatedPost) => {
    if (updatedPost?._id && selectedPost) {
      const selectedDisplayId = selectedPost.repostOf?._id || selectedPost._id;
      const updatedDisplayId = updatedPost.repostOf?._id || updatedPost._id;
      if (selectedPost._id === updatedPost._id || selectedDisplayId === updatedDisplayId) {
        setSelectedPost(updatedPost);
      }
    }

    refresh();
  };

  const likeMutation = usePostMutation(
    toggleLike,
    "",
    "Could not like post",
    refresh
  );

  const repostMutation = usePostMutation(
    repost,
    "Repost updated",
    "Could not repost",
    refresh
  );

  const commentMutation = usePostMutation(
    ({ postId, payload }) => addComment(postId, payload),
    "",
    "Could not comment",
    syncUpdatedPost
  );

  const replyMutation = usePostMutation(
    ({ postId, commentId, payload }) => replyToComment(postId, commentId, payload),
    "",
    "Could not reply",
    syncUpdatedPost
  );

  const editCommentMutation = usePostMutation(
    ({ postId, commentId, text }) => editComment(postId, commentId, text),
    "",
    "Could not edit comment",
    syncUpdatedPost
  );

  const deleteCommentMutation = usePostMutation(
    ({ postId, commentId }) => deleteComment(postId, commentId),
    "Comment removed",
    "Could not delete comment",
    syncUpdatedPost
  );

  const commentLikeMutation = usePostMutation(
    ({ postId, commentId }) => toggleCommentLike(postId, commentId),
    "",
    "Could not like comment",
    syncUpdatedPost
  );

  const commentPinMutation = usePostMutation(
    ({ postId, commentId }) => toggleCommentPin(postId, commentId),
    "",
    "Could not pin comment",
    syncUpdatedPost
  );

  const reportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: () => toast.success("Report sent"),
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, "Could not report")),
  });

  const muteMutation = useMutation({
    mutationFn: muteHashtag,
    onSuccess: () => {
      toast.success(`#${cleanTag} muted`);
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["hashtag", cleanTag] });
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, "Could not mute hashtag")),
  });

  const postActions = useMemo(
    () => ({
      currentUser: authUser,
      onOpen: setSelectedPost,
      onLike: (postId) => likeMutation.mutate(postId),
      onRepost: (postId) => repostMutation.mutate(postId),
      onComment: (postId, input) => {
        const payload = normalizeCommentPayload(input);
        if (!payload.text && !payload.gif?.url) return;
        commentMutation.mutate({ postId, payload: { ...payload, clientId: makeClientId("comment") } });
      },
      onReply: (postId, commentId, input) => {
        const payload = normalizeCommentPayload(input);
        if (!payload.text && !payload.gif?.url) return;
        replyMutation.mutate({ postId, commentId, payload: { ...payload, clientId: makeClientId("reply") } });
      },
      onEditComment: (postId, commentId, text) =>
        editCommentMutation.mutate({ postId, commentId, text }),
      onDeleteComment: (postId, commentId) =>
        deleteCommentMutation.mutate({ postId, commentId }),
      onCommentLike: (postId, commentId) =>
        commentLikeMutation.mutate({ postId, commentId }),
      onToggleCommentPin: (postId, commentId) =>
        commentPinMutation.mutate({ postId, commentId }),
      onReport: (report) => reportMutation.mutate(report),
      onHashtagClick: (nextTag) =>
        recordAlgorithmEvent({
          type: "hashtag_click",
          hashtag: nextTag,
        }).catch(() => null),
    }),
    [
      authUser,
      likeMutation,
      repostMutation,
      commentMutation,
      replyMutation,
      editCommentMutation,
      deleteCommentMutation,
      commentLikeMutation,
      commentPinMutation,
      reportMutation,
    ]
  );

  if (!cleanTag) {
    return (
      <div className="grid min-h-full place-items-center bg-base-100 p-6 text-center">
        <section className="w-full max-w-md rounded-[1.5rem] border border-base-300 bg-base-100 p-8 shadow-sm">
          <HashIcon className="mx-auto size-10 text-base-content/35" />
          <h1 className="mt-3 text-xl font-bold tracking-tight">
            Invalid hashtag
          </h1>
          <p className="mt-1 text-sm text-base-content/50">
            This hashtag link is not valid.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="relative overflow-hidden rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 size-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 size-56 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
                <HashIcon className="size-3.5" />
                Hashtag page
              </div>

              <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                #{cleanTag}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-base-content/55">
                <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-3 py-1">
                  <SparklesIcon className="size-3.5" />
                  {formatCount(data?.postCount || posts.length)} posts
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-3 py-1">
                  <TrendingUpIcon className="size-3.5" />
                  {Math.round(data?.trendingScore || 0)} score
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-base-200 px-4 text-sm font-semibold text-base-content/65 transition hover:bg-base-300 hover:text-base-content disabled:opacity-50"
                onClick={() => muteMutation.mutate(cleanTag)}
                disabled={muteMutation.isPending}
              >
                {muteMutation.isPending ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <VolumeXIcon className="size-4" />
                )}
                Mute
              </button>

              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-base-content/65 transition hover:bg-base-200 hover:text-base-content disabled:opacity-50"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCwIcon
                  className={`size-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {relatedTags.length > 0 && (
            <div className="relative mt-5 flex flex-wrap gap-2">
              {relatedTags.slice(0, 12).map((related) => (
                <Link
                  key={related}
                  to={`/hashtag/${encodeURIComponent(related)}`}
                  className="inline-flex items-center rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-sm font-semibold text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                  onClick={() =>
                    recordAlgorithmEvent({
                      type: "hashtag_click",
                      hashtag: related,
                    }).catch(() => null)
                  }
                >
                  #{related}
                </Link>
              ))}
            </div>
          )}
        </header>

        <div className="sticky top-16 z-20 rounded-2xl border border-base-300 bg-base-200/55 p-1 shadow-sm backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-1">
            <TabButton active={activeTab === "top"} onClick={() => setActiveTab("top")}>
              <FlameIcon className="size-4" />
              Top
            </TabButton>

            <TabButton active={activeTab === "recent"} onClick={() => setActiveTab("recent")}>
              <RefreshCwIcon className="size-4" />
              Recent
            </TabButton>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error">
            {getApiErrorMessage(error, "Could not load hashtag")}
          </div>
        )}

        {isLoading ? (
          <HashtagSkeleton />
        ) : posts.length ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} {...postActions} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-base-300 bg-base-100 px-5 py-14 text-center shadow-sm">
            <HashIcon className="mx-auto size-11 text-base-content/30" />

            <h2 className="mt-3 text-lg font-semibold tracking-tight">
              No posts for this hashtag yet
            </h2>

            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-base-content/50">
              Posts with #{cleanTag} will appear here when they are public and
              available in the feed.
            </p>
          </div>
        )}
      </div>

      <PostDetailDrawer
        post={currentSelectedPost}
        onClose={() => setSelectedPost(null)}
        {...postActions}
      />
    </div>
  );
}
