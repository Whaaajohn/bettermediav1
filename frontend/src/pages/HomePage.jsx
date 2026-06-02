import { createElement, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CompassIcon,
  FlameIcon,
  Globe2Icon,
  LoaderIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import PostCard from "../components/PostCard";
import PostDetailDrawer from "../components/PostDetailDrawer";
import TrendingHashtags from "../components/TrendingHashtags.jsx";
import UserBadges from "../components/UserBadges";
import useAuthUser from "../hooks/useAuthUser";
import {
  archivePost,
  addComment,
  createReport,
  deleteComment,
  deletePost,
  editComment,
  followUser,
  getSmartFeed,
  hidePost,
  muteHashtag,
  notInterestedPost,
  recordAlgorithmEvent,
  replyToComment,
  searchUsers,
  toggleCommentLike,
  toggleCommentPin,
  toggleLike,
  togglePostPin,
  repost,
  unfollowUser,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { makeLocalAvatar } from "../lib/utils";

const FEED_TABS = [
  {
    id: "for-you",
    label: "For You",
    icon: SparklesIcon,
    description: "Recommended for you",
  },
  {
    id: "following",
    label: "Following",
    icon: UsersRoundIcon,
    description: "People you follow",
  },
  {
    id: "trending",
    label: "Trending",
    icon: FlameIcon,
    description: "Popular right now",
  },
  {
    id: "language",
    label: "Language",
    icon: Globe2Icon,
    description: "Matched by language",
  },
  {
    id: "latest",
    label: "Latest",
    icon: RefreshCwIcon,
    description: "Newest posts",
  },
];

function getSuggestionQuery(authUser) {
  return (
    authUser?.learningLanguage ||
    authUser?.nativeLanguage ||
    authUser?.location ||
    ""
  ).trim();
}

function normalizeCommentPayload(input) {
  if (typeof input === "string") return { text: input.trim(), gif: null };
  return {
    text: String(input?.text || "").trim(),
    gif: input?.gif || null,
  };
}

function makeClientId(prefix = "client") {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${random}`;
}

function updateFeedPosts(oldData, updater) {
  if (!oldData) return oldData;
  if (Array.isArray(oldData)) return updater(oldData);
  const posts = oldData.posts || oldData.items;
  if (!Array.isArray(posts)) return oldData;
  const nextPosts = updater(posts);
  return oldData.posts ? { ...oldData, posts: nextPosts } : { ...oldData, items: nextPosts };
}

function updatePostList(posts, postId, updater) {
  return posts.map((post) => {
    const displayId = post.repostOf?._id || post._id;
    if (post._id !== postId && displayId !== postId) return post;

    if (post.repostOf?._id === postId) {
      return { ...post, repostOf: updater(post.repostOf) };
    }
    return updater(post);
  });
}

function getActiveTab(feedMode) {
  return FEED_TABS.find((tab) => tab.id === feedMode) || FEED_TABS[0];
}

function formatCount(value = 0) {
  const number = Number(value || 0);

  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;

  return String(number);
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-[1.5rem] border border-base-300 bg-base-100 px-5 py-14 text-center shadow-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-base-200 text-base-content/40">
        {createElement(Icon, { className: "size-6" })}
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>

      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-base-content/50">
          {description}
        </p>
      )}

      {action}
    </div>
  );
}

function InlineError({ error, fallback }) {
  if (!error) return null;

  return (
    <div className="rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error">
      <div className="flex items-center gap-2">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{getApiErrorMessage(error, fallback)}</span>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <div className="size-11 rounded-full bg-base-300" />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-4 w-44 rounded-full bg-base-300" />
              <div className="h-3 w-72 max-w-full rounded-full bg-base-300" />
              <div className="h-28 rounded-2xl bg-base-300" />

              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-full bg-base-300" />
                <div className="h-8 w-20 rounded-full bg-base-300" />
                <div className="h-8 w-20 rounded-full bg-base-300" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedTopBar({ activeTab, feedCount, fetchingFeed, onRefresh }) {
  const Icon = activeTab.icon;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-base-300 pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/60">
            <Icon className="size-4" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {activeTab.label}
            </h1>

            <p className="mt-0.5 truncate text-sm text-base-content/45">
              {formatCount(feedCount)} posts · {activeTab.description}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-base-content/55 transition hover:bg-base-200 hover:text-base-content disabled:opacity-50"
        onClick={onRefresh}
        disabled={fetchingFeed}
        aria-label="Refresh feed"
      >
        {fetchingFeed ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <RefreshCwIcon className="size-4" />
        )}
      </button>
    </header>
  );
}

function FeedTabs({ feedMode, onChange }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 bg-base-100/90 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-0 lg:px-0">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-base-300 bg-base-200/55 p-1 shadow-sm">
        {FEED_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = feedMode === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={[
                "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition",
                active
                  ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
                  : "text-base-content/50 hover:bg-base-100/70 hover:text-base-content",
              ].join(" ")}
              onClick={() => onChange(tab.id)}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileMiniCard({ authUser }) {
  const avatar =
    authUser?.profilePic ||
    makeLocalAvatar(authUser?.fullName || authUser?.username || "User");

  return (
    <section className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link
          to={authUser?._id ? `/profile/${authUser._id}` : "/settings"}
          className="size-11 shrink-0 overflow-hidden rounded-full bg-base-300 ring-1 ring-base-300"
        >
          <img
            src={avatar}
            alt={authUser?.fullName || "User"}
            className="h-full w-full object-cover"
          />
        </Link>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              {authUser?.fullName || "User"}
            </h2>
            <UserBadges badges={authUser?.badges || []} compact />
          </div>

          <p className="truncate text-xs text-base-content/50">
            @{authUser?.username || "username"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <Link
          to={authUser?._id ? `/profile/${authUser._id}` : "/settings"}
          className="rounded-2xl bg-base-200/65 p-3 transition hover:bg-base-200"
        >
          <p className="font-semibold">{formatCount(authUser?.followerCount)}</p>
          <p className="text-xs text-base-content/45">Followers</p>
        </Link>

        <Link
          to={authUser?._id ? `/profile/${authUser._id}` : "/settings"}
          className="rounded-2xl bg-base-200/65 p-3 transition hover:bg-base-200"
        >
          <p className="font-semibold">
            {formatCount(authUser?.followingCount)}
          </p>
          <p className="text-xs text-base-content/45">Following</p>
        </Link>
      </div>
    </section>
  );
}

function SuggestedPersonRow({ user, isBusy, onFollow, onUnfollow }) {
  const avatar =
    user?.profilePic ||
    makeLocalAvatar(user?.fullName || user?.username || "User");

  const requested = user?.hasPendingFollowRequest || user?.hasRequestedFollow;

  return (
    <div className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-base-200/70">
      <Link
        to={`/profile/${user._id}`}
        className="size-10 shrink-0 overflow-hidden rounded-full bg-base-300"
      >
        <img
          src={avatar}
          alt={user.fullName || "User"}
          className="h-full w-full object-cover"
        />
      </Link>

      <Link to={`/profile/${user._id}`} className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{user.fullName}</p>
          <UserBadges badges={user.badges || []} compact />
        </div>

        <p className="truncate text-xs text-base-content/45">
          @{user.username || "unknown"}
        </p>
      </Link>

      {user.isFollowing ? (
        <button
          type="button"
          className="h-8 rounded-full bg-base-200 px-3 text-xs font-semibold text-base-content/65 transition hover:bg-base-300 hover:text-base-content disabled:opacity-50"
          onClick={() => onUnfollow(user._id)}
          disabled={isBusy}
        >
          Following
        </button>
      ) : (
        <button
          type="button"
          className="h-8 rounded-full bg-primary px-3 text-xs font-semibold text-primary-content transition hover:bg-primary/90 disabled:opacity-50"
          onClick={() => onFollow(user._id)}
          disabled={isBusy || requested}
        >
          {requested ? "Requested" : "Follow"}
        </button>
      )}
    </div>
  );
}

const HomePage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [selectedPost, setSelectedPost] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [feedMode, setFeedMode] = useState("for-you");

  const activeTab = getActiveTab(feedMode);
  const suggestionQuery = getSuggestionQuery(authUser);

  const {
    data: feedResponse,
    isLoading: loadingFeed,
    isFetching: fetchingFeed,
    error: feedError,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ["feed", feedMode],
    queryFn: () => getSmartFeed(feedMode),
    enabled: Boolean(authUser?._id),
    staleTime: 2500,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const feed = useMemo(() => {
    if (Array.isArray(feedResponse)) return feedResponse;
    return feedResponse?.items || feedResponse?.posts || [];
  }, [feedResponse]);

  const {
    data: people = [],
    isLoading: loadingPeople,
    error: peopleError,
  } = useQuery({
    queryKey: ["people", "suggested", suggestionQuery],
    queryFn: () => searchUsers(suggestionQuery),
    enabled: Boolean(authUser?._id && suggestionQuery),
    staleTime: 60_000,
    retry: 1,
  });

  const refreshSocial = () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["people"] });
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  const currentSelectedPost =
    feed.find((post) => post._id === selectedPost?._id) || selectedPost;

  const syncUpdatedPost = (updatedPost) => {
    if (updatedPost?._id && selectedPost) {
      const selectedDisplayId = selectedPost.repostOf?._id || selectedPost._id;
      const updatedDisplayId = updatedPost.repostOf?._id || updatedPost._id;
      if (selectedPost._id === updatedPost._id || selectedDisplayId === updatedDisplayId) {
        setSelectedPost(updatedPost);
      }
    }

    refreshSocial();
  };

  const suggestedPeople = useMemo(() => {
    return (people || [])
      .filter((user) => user?._id)
      .filter((user) => user._id !== authUser?._id)
      .filter((user) => !user.isFollowing)
      .filter((user) => !user.hasRequestedFollow)
      .filter((user) => !user.hasPendingFollowRequest)
      .slice(0, 5);
  }, [people, authUser?._id]);

  const { mutate: followMutation } = useMutation({
    mutationFn: followUser,
    onMutate: (userId) => setBusyUserId(userId),
    onSuccess: (data) => {
      refreshSocial();
      toast.success(
        data?.status === "requested" ? "Follow requested" : "Following"
      );
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not follow")),
    onSettled: () => setBusyUserId(null),
  });

  const { mutate: unfollowMutation } = useMutation({
    mutationFn: unfollowUser,
    onMutate: (userId) => setBusyUserId(userId),
    onSuccess: () => {
      refreshSocial();
      toast.success("Unfollowed");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not unfollow")),
    onSettled: () => setBusyUserId(null),
  });

  const { mutate: likeMutation } = useMutation({
    mutationFn: toggleLike,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["feed"] });
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData) =>
        updateFeedPosts(oldData, (posts) =>
          updatePostList(posts, postId, (post) => {
            const isLiked = !post.isLiked;
            return {
              ...post,
              isLiked,
              likeCount: Math.max(0, Number(post.likeCount || 0) + (isLiked ? 1 : -1)),
              status: post.status === "failed" ? post.status : "syncing",
            };
          })
        )
      );
      return { snapshots };
    },
    onSuccess: syncUpdatedPost,
    onError: (error, _postId, context) => {
      context?.snapshots?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      toast.error(getApiErrorMessage(error, "Could not like post"));
    },
  });

  const { mutate: repostMutation } = useMutation({
    mutationFn: repost,
    onSuccess: (data) => {
      refreshSocial();
      toast.success(data?.removed ? "Repost removed" : "Reposted");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not repost")),
  });

  const { mutate: archiveMutation } = useMutation({
    mutationFn: archivePost,
    onSuccess: () => {
      refreshSocial();
      toast.success("Post archived");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not archive post")),
  });

  const { mutate: deletePostMutation } = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      setSelectedPost(null);
      refreshSocial();
      toast.success("Post deleted");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not delete post")),
  });

  const { mutate: commentMutation } = useMutation({
    mutationFn: ({ postId, payload }) => addComment(postId, payload),
    onSuccess: syncUpdatedPost,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not comment")),
  });

  const { mutate: replyMutation } = useMutation({
    mutationFn: ({ postId, commentId, payload }) =>
      replyToComment(postId, commentId, payload),
    onSuccess: syncUpdatedPost,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not reply")),
  });

  const { mutate: editCommentMutation } = useMutation({
    mutationFn: ({ postId, commentId, text }) =>
      editComment(postId, commentId, text.trim()),
    onSuccess: syncUpdatedPost,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not edit comment")),
  });

  const { mutate: deleteCommentMutation } = useMutation({
    mutationFn: ({ postId, commentId }) => deleteComment(postId, commentId),
    onSuccess: syncUpdatedPost,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not delete comment")),
  });

  const { mutate: commentLikeMutation } = useMutation({
    mutationFn: ({ postId, commentId }) => toggleCommentLike(postId, commentId),
    onSuccess: syncUpdatedPost,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not like comment")),
  });

  const { mutate: commentPinMutation } = useMutation({
    mutationFn: ({ postId, commentId }) => toggleCommentPin(postId, commentId),
    onSuccess: syncUpdatedPost,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not pin comment")),
  });

  const { mutate: postPinMutation } = useMutation({
    mutationFn: togglePostPin,
    onSuccess: (post) => {
      syncUpdatedPost(post);
      toast.success(post?.pinnedAt ? "Pinned to profile" : "Unpinned from profile");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not pin post")),
  });

  const { mutate: reportMutation } = useMutation({
    mutationFn: createReport,
    onSuccess: () => toast.success("Report sent to moderation"),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not report")),
  });

  const { mutate: hidePostMutation } = useMutation({
    mutationFn: hidePost,
    onSuccess: () => {
      refreshSocial();
      toast.success("Post hidden");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not hide post")),
  });

  const { mutate: notInterestedMutation } = useMutation({
    mutationFn: notInterestedPost,
    onSuccess: () => {
      refreshSocial();
      toast.success("We will show less like this");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update feed")),
  });

  const { mutate: muteHashtagMutation } = useMutation({
    mutationFn: muteHashtag,
    onSuccess: (_, tag) => {
      refreshSocial();
      toast.success(`#${tag} muted`);
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not mute hashtag")),
  });

  const seeMoreLikeThis = (post) => {
    const tags = post?.finalTags?.length ? post.finalTags : post?.hashtags || [];

    recordAlgorithmEvent({
      type: "see_more",
      postId: post?._id,
      hashtag: tags[0],
      source: feedMode,
    }).catch(() => null);

    toast.success("We will show more like this");
  };

  const trackHashtagClick = (tag) => {
    recordAlgorithmEvent({
      type: "hashtag_click",
      hashtag: tag,
      source: feedMode,
    }).catch(() => null);
  };

  const safeComment = (postId, input) => {
    const payload = normalizeCommentPayload(input);

    if (!payload.text && !payload.gif?.url) {
      toast.error("Write a comment first");
      return;
    }

    commentMutation({ postId, payload: { ...payload, clientId: makeClientId("comment") } });
  };

  const safeReply = (postId, commentId, input) => {
    const payload = normalizeCommentPayload(input);

    if (!payload.text && !payload.gif?.url) {
      toast.error("Write a reply first");
      return;
    }

    replyMutation({ postId, commentId, payload: { ...payload, clientId: makeClientId("reply") } });
  };

  const safeEditComment = (postId, commentId, text) => {
    const clean = String(text || "").trim();

    if (!clean) {
      toast.error("Comment cannot be empty");
      return;
    }

    editCommentMutation({ postId, commentId, text: clean });
  };

  const postActions = {
    currentUser: authUser,
    onArchive: archiveMutation,
    onDeletePost: (postId) => {
      if (!postId) return;
      if (window.confirm("Delete this post?")) deletePostMutation(postId);
    },
    onDeleteComment: (postId, commentId) =>
      deleteCommentMutation({ postId, commentId }),
    onEditComment: safeEditComment,
    onCommentLike: (postId, commentId) =>
      commentLikeMutation({ postId, commentId }),
    onToggleCommentPin: (postId, commentId) =>
      commentPinMutation({ postId, commentId }),
    onFollow: followMutation,
    onHashtagClick: trackHashtagClick,
    onHidePost: hidePostMutation,
    onLike: likeMutation,
    onMuteHashtag: (tag) => tag && muteHashtagMutation(tag),
    onNotInterested: notInterestedMutation,
    onPinPost: postPinMutation,
    onReply: safeReply,
    onRepost: repostMutation,
    onComment: safeComment,
    onReport: reportMutation,
    onSeeMoreLikeThis: seeMoreLikeThis,
    onUnfollow: unfollowMutation,
  };

  if (!authUser) {
    return (
      <div className="grid min-h-full place-items-center bg-base-100 p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg" />
          <p className="text-sm text-base-content/50">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,40rem)_19rem] xl:justify-center">
        <section className="min-w-0 space-y-4">
          <FeedTopBar
            activeTab={activeTab}
            feedCount={feed.length}
            fetchingFeed={fetchingFeed}
            onRefresh={() => refetchFeed()}
          />

          <FeedTabs feedMode={feedMode} onChange={setFeedMode} />

          <div className="xl:hidden">
            <TrendingHashtags onTagClick={trackHashtagClick} />
          </div>

          <InlineError error={feedError} fallback="Could not load feed" />

          {loadingFeed ? (
            <FeedSkeleton />
          ) : feed.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="Your feed is quiet right now"
              description="Post something, follow people, or tune your interests so BetterMedia can build a better feed for you."
              action={
                <Link
                  to="/explore"
                  className="btn btn-primary mt-5 h-11 rounded-2xl"
                >
                  Explore people
                  <ArrowRightIcon className="size-4" />
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {feed.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onOpen={setSelectedPost}
                  {...postActions}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-20 space-y-4">
            <ProfileMiniCard authUser={authUser} />

            <TrendingHashtags onTagClick={trackHashtagClick} />

            <section className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold tracking-tight">
                    People to follow
                  </h2>
                  <p className="mt-1 text-xs text-base-content/45">
                    Based on your language profile.
                  </p>
                </div>

                <CompassIcon className="size-4 text-base-content/35" />
              </div>

              <InlineError
                error={peopleError}
                fallback="Could not load suggestions"
              />

              <div className="mt-4 space-y-1">
                {loadingPeople ? (
                  <div className="flex justify-center py-6">
                    <span className="loading loading-spinner" />
                  </div>
                ) : suggestedPeople.length === 0 ? (
                  <div className="rounded-2xl border border-base-300 bg-base-200/50 p-4 text-sm leading-5 text-base-content/55">
                    Explore has more people when suggestions are quiet.
                  </div>
                ) : (
                  suggestedPeople.map((user) => (
                    <SuggestedPersonRow
                      key={user._id}
                      user={user}
                      isBusy={busyUserId === user._id}
                      onFollow={followMutation}
                      onUnfollow={unfollowMutation}
                    />
                  ))
                )}
              </div>

              <Link
                to="/explore"
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-base-200 text-sm font-semibold text-base-content/65 transition hover:bg-base-300 hover:text-base-content"
              >
                Open Explore
                <ArrowRightIcon className="size-4" />
              </Link>
            </section>
          </div>
        </aside>
      </div>

      <PostDetailDrawer
        post={currentSelectedPost}
        onClose={() => setSelectedPost(null)}
        {...postActions}
      />
    </div>
  );
};

export default HomePage;
