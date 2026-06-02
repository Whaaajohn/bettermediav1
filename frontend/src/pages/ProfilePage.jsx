import { createElement, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import {
  ArchiveIcon,
  BanIcon,
  FlagIcon,
  Grid3X3Icon,
  LockIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  Repeat2Icon,
  SettingsIcon,
  UserCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import PostCard from "../components/PostCard";
import PostDetailDrawer from "../components/PostDetailDrawer";
import UserBadges from "../components/UserBadges";
import useAuthUser from "../hooks/useAuthUser";
import {
  addComment,
  archivePost,
  blockUser,
  createReport,
  deleteComment,
  deletePost,
  editComment,
  followUser,
  getFollowers,
  getProfilePosts,
  getUserProfile,
  removeFollower,
  repost,
  replyToComment,
  toggleCommentLike,
  toggleCommentPin,
  toggleLike,
  togglePostPin,
  unblockUser,
  unfollowUser,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { promptReport } from "../lib/reports";
import { formatLastSeen, makeLocalAvatar } from "../lib/utils";

const tabs = [
  ["posts", "Posts", Grid3X3Icon],
  ["reposts", "Reposts", Repeat2Icon],
  ["archived", "Archive", ArchiveIcon],
];

function StatButton({ value, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left hover:opacity-70 transition"
    >
      <span className="font-semibold">{value || 0}</span>{" "}
      <span>{label}</span>
    </button>
  );
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

function languageGroupSlug(type, language) {
  return `${type}-${String(language || "").toLowerCase().replace(/\s+/g, "-")}`;
}

function FollowListModal({ user, type, isMe, onClose, onRemoveFollower }) {
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["follows", user?._id, type],
    queryFn: () => getFollowers(user._id, type),
    enabled: Boolean(user?._id && type),
    retry: false,
  });

  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral/70 backdrop-blur-sm flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-base-100 border border-base-300 rounded-3xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {type === "followers" ? "Followers" : "Following"}
          </h2>

          <button className="btn btn-ghost btn-sm rounded-full" onClick={onClose}>
            Close
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner" />
          </div>
        ) : error ? (
          <div className="alert">
            <LockIcon className="size-4" />
            <span>{getApiErrorMessage(error, "This list is private")}</span>
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {users.map((item) => (
              <div
                key={item._id}
                className="flex items-center gap-3 rounded-2xl p-2 hover:bg-base-200 transition"
              >
                <Link
                  to={`/profile/${item._id}`}
                  onClick={onClose}
                  className="avatar shrink-0"
                >
                  <div className="w-11 rounded-full bg-base-300">
                    <img
                      src={item.profilePic || makeLocalAvatar(item.fullName || item.username)}
                      alt={item.fullName || "User"}
                    />
                  </div>
                </Link>

                <Link
                  to={`/profile/${item._id}`}
                  onClick={onClose}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold truncate">{item.fullName}</p>
                    <UserBadges badges={item.badges} compact />
                  </div>
                  <p className="text-xs opacity-70">@{item.username}</p>
                </Link>

                {isMe && type === "followers" && (
                  <button
                    className="btn btn-outline btn-xs rounded-full"
                    onClick={() => onRemoveFollower?.(item._id)}
                  >
                    <UserMinusIcon className="size-3" />
                    Remove
                  </button>
                )}
              </div>
            ))}

            {users.length === 0 && (
              <p className="text-sm opacity-70 py-6 text-center">
                No users yet.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [activeTab, setActiveTab] = useState("posts");
  const [followListType, setFollowListType] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUserProfile(id),
    enabled: !!id,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["profilePosts", id],
    queryFn: () => getProfilePosts(id),
    enabled: !!id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["user", id] });
    queryClient.invalidateQueries({ queryKey: ["profilePosts", id] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
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

  const { mutate: followMutation, isPending: followPending } = useMutation({
    mutationFn: followUser,
    onSuccess: (data) => {
      refresh();
      toast.success(data.status === "requested" ? "Follow requested" : "Following");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not follow")),
  });

  const { mutate: unfollowMutation, isPending: unfollowPending } = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      refresh();
      toast.success("Unfollowed");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not unfollow")),
  });

  const { mutate: removeFollowerMutation } = useMutation({
    mutationFn: removeFollower,
    onSuccess: () => {
      refresh();
      toast.success("Follower removed");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not remove follower")),
  });

  const { mutate: blockMutation, isPending: blockPending } = useMutation({
    mutationFn: () =>
      user?.isBlockedByMe ? unblockUser(user._id) : blockUser(user._id),
    onSuccess: () => {
      refresh();
      toast.success(user?.isBlockedByMe ? "User unblocked" : "User blocked");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update block")),
  });

  const { mutate: likeMutation } = useMutation({
    mutationFn: toggleLike,
    onSuccess: refresh,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not like post")),
  });

  const { mutate: repostMutation } = useMutation({
    mutationFn: repost,
    onSuccess: (data) => {
      refresh();
      toast.success(data?.removed ? "Repost removed" : "Reposted");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not repost")),
  });

  const { mutate: archiveMutation } = useMutation({
    mutationFn: archivePost,
    onSuccess: refresh,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not archive post")),
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

  const { mutate: deletePostMutation } = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      setSelectedPost(null);
      refresh();
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
      editComment(postId, commentId, text),
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

  const { mutate: reportMutation } = useMutation({
    mutationFn: createReport,
    onSuccess: () => toast.success("Report sent to moderation"),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not report")),
  });

  const isMe = authUser?._id === user?._id;
  const visibleTabs = isMe ? tabs : tabs.filter(([value]) => value !== "archived");

  const filteredPosts = useMemo(() => {
    if (activeTab === "reposts") return posts.filter((post) => post.repostOf);
    if (activeTab === "archived") return posts.filter((post) => post.archived);
    return posts.filter((post) => !post.repostOf && !post.archived);
  }, [activeTab, posts]);

  const currentSelectedPost =
    posts.find((post) => post._id === selectedPost?._id) || selectedPost;

  const postCount = posts.filter((post) => !post.repostOf && !post.archived).length;

  const postActions = {
    currentUser: authUser,
    onArchive: archiveMutation,
    onDeletePost: (postId) => {
      if (window.confirm("Delete this post?")) deletePostMutation(postId);
    },
    onDeleteComment: (postId, commentId) =>
      deleteCommentMutation({ postId, commentId }),
    onEditComment: (postId, commentId, text) =>
      editCommentMutation({ postId, commentId, text }),
    onCommentLike: (postId, commentId) =>
      commentLikeMutation({ postId, commentId }),
    onToggleCommentPin: (postId, commentId) =>
      commentPinMutation({ postId, commentId }),
    onFollow: followMutation,
    onLike: likeMutation,
    onReply: (postId, commentId, input) => {
      const payload = normalizeCommentPayload(input);
      if (!payload.text && !payload.gif?.url) return;
      replyMutation({ postId, commentId, payload: { ...payload, clientId: makeClientId("reply") } });
    },
    onRepost: repostMutation,
    onPinPost: postPinMutation,
    onComment: (postId, input) => {
      const payload = normalizeCommentPayload(input);
      if (!payload.text && !payload.gif?.url) return;
      commentMutation({ postId, payload: { ...payload, clientId: makeClientId("comment") } });
    },
    onReport: reportMutation,
    onUnfollow: unfollowMutation,
  };

  const handleReportProfile = async () => {
    if (!user?._id) return;
    const report = await promptReport("user", user._id);
    if (report) reportMutation(report);
  };

  const handleBlockProfile = () => {
    if (!user?._id || blockPending) return;
    blockMutation();
  };

  const followBusy = followPending || unfollowPending;
  const avatarSrc = user?.profilePic || makeLocalAvatar(user?.fullName || user?.username || "User");

  const onlineText = user?.isOnline
    ? "Online"
    : user?.lastSeen
    ? `Last seen ${formatLastSeen(user.lastSeen)}`
    : "Offline";

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-sm opacity-70 mt-2">
          This account may not exist anymore.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-base-300 pb-8">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] gap-5 sm:gap-10 items-start">
            <div className="flex justify-center sm:justify-end">
              <div className="avatar">
                <div className="w-24 sm:w-36 md:w-40 rounded-full bg-base-300 ring-2 ring-base-300">
                  <img src={avatarSrc} alt={user.fullName || "Profile"} />
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold truncate">
                  {user.username}
                </h1>

                <UserBadges badges={user.badges} />

                {user.isPrivate && <LockIcon className="size-4 opacity-70" />}

                <span
                  className={`size-2.5 rounded-full shrink-0 ${
                    user.inCall
                      ? "bg-warning"
                      : user.isOnline
                      ? "bg-success"
                      : "bg-base-content/30"
                  }`}
                  title={onlineText}
                />

                {!isMe && (
                  <div className="dropdown dropdown-end ml-auto">
                    <button
                      tabIndex={0}
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm"
                      aria-label="Profile options"
                    >
                      <MoreHorizontalIcon className="size-5" />
                    </button>

                    <ul
                      tabIndex={0}
                      className="dropdown-content menu bg-base-100 rounded-2xl z-30 w-52 p-2 shadow-xl border border-base-300"
                    >
                      <li>
                        <button type="button" onClick={handleReportProfile}>
                          <FlagIcon className="size-4" />
                          Report profile
                        </button>
                      </li>

                      <li>
                        <button
                          type="button"
                          onClick={handleBlockProfile}
                          disabled={blockPending}
                          className={!user.isBlockedByMe ? "text-error" : ""}
                        >
                          <BanIcon className="size-4" />
                          {user.isBlockedByMe ? "Unblock user" : "Block user"}
                        </button>
                      </li>
                    </ul>
                  </div>
                )}

                {isMe && (
                  <Link
                    to="/settings"
                    className="btn btn-ghost btn-circle btn-sm ml-auto"
                    aria-label="Settings"
                  >
                    <SettingsIcon className="size-5" />
                  </Link>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-8 text-base">
                <button
                  type="button"
                  onClick={() => setActiveTab("posts")}
                  className="hover:opacity-70 transition"
                >
                  <span className="font-semibold">{postCount}</span> posts
                </button>

                <StatButton
                  value={user.followerCount}
                  label="followers"
                  onClick={() => setFollowListType("followers")}
                />

                <StatButton
                  value={user.followingCount}
                  label="following"
                  onClick={() => setFollowListType("following")}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{user.fullName}</p>
                  {user.isOnline && (
                    <span className="badge badge-success badge-sm">online</span>
                  )}
                </div>

                {user.bio ? (
                  <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                    {user.bio}
                  </p>
                ) : (
                  <p className="text-sm opacity-50">No bio yet.</p>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm opacity-80">
                  {user.location && <span>{user.location}</span>}
                  {user.nativeLanguage && (
                    <Link
                      to={`/language-groups/${languageGroupSlug("native", user.nativeLanguage)}`}
                      className="hover:underline"
                    >
                      Native: {user.nativeLanguage}
                    </Link>
                  )}
                  {user.learningLanguage && (
                    <Link
                      to={`/language-groups/${languageGroupSlug("learning", user.learningLanguage)}`}
                      className="hover:underline"
                    >
                      Learning: {user.learningLanguage}
                    </Link>
                  )}
                </div>

                <p className="text-xs opacity-50">{onlineText}</p>
              </div>
            </div>
          </div>

          <div className="sm:hidden grid grid-cols-3 text-center mt-6 border-y border-base-300 py-3">
            <button type="button" onClick={() => setActiveTab("posts")}>
              <p className="font-semibold">{postCount}</p>
              <p className="text-xs opacity-60">posts</p>
            </button>

            <button type="button" onClick={() => setFollowListType("followers")}>
              <p className="font-semibold">{user.followerCount || 0}</p>
              <p className="text-xs opacity-60">followers</p>
            </button>

            <button type="button" onClick={() => setFollowListType("following")}>
              <p className="font-semibold">{user.followingCount || 0}</p>
              <p className="text-xs opacity-60">following</p>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:flex gap-2 sm:ml-[220px]">
            {isMe ? (
              <>
                <Link
                  to="/settings"
                  className="btn bg-base-200 hover:bg-base-300 border-0 rounded-xl min-h-0 h-11 px-8"
                >
                  Edit profile
                </Link>

                <button
                  type="button"
                  className="btn bg-base-200 hover:bg-base-300 border-0 rounded-xl min-h-0 h-11 px-8"
                  onClick={() => setActiveTab("archived")}
                >
                  View archive
                </button>
              </>
            ) : user.isBlockedByMe ? (
              <button
                className="btn btn-error text-white rounded-xl min-h-0 h-11 px-8"
                onClick={handleBlockProfile}
                disabled={blockPending}
              >
                <BanIcon className="size-4" />
                Unblock
              </button>
            ) : (
              <>
                {user.isFollowing ? (
                  <button
                    className="btn bg-base-200 hover:bg-base-300 border-0 rounded-xl min-h-0 h-11 px-8"
                    onClick={() => unfollowMutation(user._id)}
                    disabled={followBusy}
                  >
                    <UserCheckIcon className="size-4" />
                    Following
                  </button>
                ) : (
                  <button
                    className="btn btn-primary rounded-xl min-h-0 h-11 px-8"
                    onClick={() => followMutation(user._id)}
                    disabled={followBusy || user.hasPendingFollowRequest}
                  >
                    <UserPlusIcon className="size-4" />
                    {user.hasPendingFollowRequest ? "Requested" : "Follow"}
                  </button>
                )}

                <Link
                  to={`/chat/${user._id}`}
                  className="btn bg-base-200 hover:bg-base-300 border-0 rounded-xl min-h-0 h-11 px-8"
                >
                  <MessageCircleIcon className="size-4" />
                  Message
                </Link>
              </>
            )}
          </div>
        </header>

        <nav className="mt-4 flex justify-center border-b border-base-300 pb-3">
          <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-base-300 bg-base-200/55 p-1 shadow-sm">
          {visibleTabs.map(([value, label, Icon]) => (
            <button
              key={value}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wide transition ${
                activeTab === value
                  ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
                  : "text-base-content/50 hover:bg-base-100/70 hover:text-base-content"
              }`}
              onClick={() => setActiveTab(value)}
            >
              {createElement(Icon, { className: "size-4" })}
              {label}
            </button>
          ))}
          </div>
        </nav>

        {user.privateLimited && !isMe ? (
          <section className="mt-6 rounded-3xl border border-base-300 bg-base-100 p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-base-200">
              <LockIcon className="size-7 opacity-55" />
            </div>
            <h2 className="text-lg font-semibold">This account is private</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-base-content/55">
              Follow this account and wait for approval to see posts, reposts,
              language details, and activity.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-3 gap-1 sm:gap-2 pt-2">
            {filteredPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                compact
                onOpen={setSelectedPost}
                {...postActions}
              />
            ))}

            {filteredPosts.length === 0 && (
              <div className="col-span-3 border border-base-300 rounded-2xl p-10 text-center opacity-70 mt-4">
                Nothing here yet.
              </div>
            )}
          </section>
        )}
      </div>

      <FollowListModal
        user={user}
        type={followListType}
        isMe={isMe}
        onClose={() => setFollowListType(null)}
        onRemoveFollower={(userId) => removeFollowerMutation(userId)}
      />

      <PostDetailDrawer
        post={currentSelectedPost}
        onClose={() => setSelectedPost(null)}
        {...postActions}
      />
    </div>
  );
}
