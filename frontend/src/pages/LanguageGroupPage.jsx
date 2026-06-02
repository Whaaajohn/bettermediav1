import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe2Icon,
  LoaderIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  UsersRoundIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import PostCard from "../components/PostCard.jsx";
import PostDetailDrawer from "../components/PostDetailDrawer.jsx";
import UserBadges from "../components/UserBadges.jsx";
import useAuthUser from "../hooks/useAuthUser.js";
import {
  addComment,
  createReport,
  deleteComment,
  editComment,
  getLanguageGroupPosts,
  replyToComment,
  repost,
  toggleCommentLike,
  toggleCommentPin,
  toggleLike,
} from "../lib/api.js";
import { getApiErrorMessage } from "../lib/errors.js";
import { makeLocalAvatar } from "../lib/utils.js";

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

function usePostMutation(fn, fallback, onRefresh) {
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => onRefresh?.(data),
    onError: (error) => toast.error(getApiErrorMessage(error, fallback)),
  });
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition",
        active
          ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
          : "text-base-content/50 hover:bg-base-100/70 hover:text-base-content",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function LanguageGroupPage() {
  const { slug = "" } = useParams();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);

  const cleanSlug = String(slug || "").toLowerCase();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["languageGroup", cleanSlug],
    queryFn: () => getLanguageGroupPosts(cleanSlug),
    enabled: Boolean(cleanSlug),
    staleTime: 30_000,
    retry: 1,
  });

  const group = data?.group;
  const posts = useMemo(() => data?.posts || [], [data?.posts]);
  const members = useMemo(() => group?.members || [], [group?.members]);
  const currentSelectedPost = posts.find((post) => post._id === selectedPost?._id) || selectedPost;

  const refresh = (updatedPost) => {
    if (updatedPost?._id && selectedPost) setSelectedPost(updatedPost);
    queryClient.invalidateQueries({ queryKey: ["languageGroup", cleanSlug] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const likeMutation = usePostMutation(toggleLike, "Could not like post", refresh);
  const repostMutation = usePostMutation(repost, "Could not repost", refresh);
  const commentMutation = usePostMutation(
    ({ postId, payload }) => addComment(postId, payload),
    "Could not comment",
    refresh
  );
  const replyMutation = usePostMutation(
    ({ postId, commentId, payload }) => replyToComment(postId, commentId, payload),
    "Could not reply",
    refresh
  );
  const editCommentMutation = usePostMutation(
    ({ postId, commentId, text }) => editComment(postId, commentId, text),
    "Could not edit comment",
    refresh
  );
  const deleteCommentMutation = usePostMutation(
    ({ postId, commentId }) => deleteComment(postId, commentId),
    "Could not delete comment",
    refresh
  );
  const commentLikeMutation = usePostMutation(
    ({ postId, commentId }) => toggleCommentLike(postId, commentId),
    "Could not like comment",
    refresh
  );
  const commentPinMutation = usePostMutation(
    ({ postId, commentId }) => toggleCommentPin(postId, commentId),
    "Could not pin comment",
    refresh
  );
  const reportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: () => toast.success("Report sent"),
    onError: (reportError) => toast.error(getApiErrorMessage(reportError, "Could not report")),
  });

  const postActions = {
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
  };

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
                <Globe2Icon className="size-3.5" />
                Language group
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {group?.name || "Language group"}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-base-content/55">
                {group?.description || "Posts and people matched by language."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-base-content/55">
                <span className="rounded-full border border-base-300 bg-base-100 px-3 py-1">
                  {group?.memberCount || 0} members
                </span>
                <span className="rounded-full border border-base-300 bg-base-100 px-3 py-1">
                  {group?.postCount || posts.length} posts
                </span>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-base-200 px-4 text-sm font-semibold text-base-content/65 transition hover:bg-base-300 hover:text-base-content disabled:opacity-50"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? <LoaderIcon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              Refresh
            </button>
          </div>
        </header>

        <div className="sticky top-16 z-20 rounded-2xl border border-base-300 bg-base-200/55 p-1 shadow-sm backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-1">
            <TabButton active={activeTab === "posts"} onClick={() => setActiveTab("posts")}>
              <MessageCircleIcon className="size-4" />
              Posts
            </TabButton>
            <TabButton active={activeTab === "people"} onClick={() => setActiveTab("people")}>
              <UsersRoundIcon className="size-4" />
              People
            </TabButton>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error">
            {getApiErrorMessage(error, "Could not load language group")}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : activeTab === "people" ? (
          <section className="grid gap-2 sm:grid-cols-2">
            {members.map((member) => (
              <Link
                key={member._id}
                to={`/profile/${member._id}`}
                className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm transition hover:bg-base-200/55"
              >
                <img
                  src={member.profilePic || makeLocalAvatar(member.fullName || member.username || "User")}
                  alt={member.fullName || "User"}
                  className="size-11 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold">{member.username || member.fullName}</p>
                    <UserBadges badges={member.badges || []} compact />
                  </div>
                  <p className="truncate text-xs text-base-content/50">{member.fullName}</p>
                </div>
              </Link>
            ))}
          </section>
        ) : posts.length ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} {...postActions} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-base-300 bg-base-100 px-5 py-14 text-center shadow-sm">
            <Globe2Icon className="mx-auto size-11 text-base-content/30" />
            <h2 className="mt-3 text-lg font-semibold tracking-tight">No posts yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-base-content/50">
              Posts in this language will appear here when they are public.
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
