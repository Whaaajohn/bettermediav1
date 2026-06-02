import { Link } from "react-router";
import {
  ClockIcon,
  LockIcon,
  MessageCircleIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "lucide-react";

import UserBadges from "./UserBadges";
import { formatLastSeen, makeLocalAvatar } from "../lib/utils";

function formatCount(value) {
  const number = Number(value || 0);

  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;

  return String(number);
}

function getStatusText(user) {
  if (user?.inCall) return "In a call";
  if (user?.isOnline) return "Online";
  return `Last seen ${formatLastSeen(user?.lastSeen)}`;
}

function StatusDot({ user }) {
  const statusClass = user?.inCall
    ? "bg-warning"
    : user?.isOnline
    ? "bg-success"
    : "bg-base-content/25";

  const label = getStatusText(user);

  return (
    <span
      className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-100 ${statusClass}`}
      title={label}
      aria-label={label}
    />
  );
}

export default function UserFollowCard({
  user,
  onFollow,
  onUnfollow,
  isBusy = false,
  currentUserId,
}) {
  if (!user?._id) return null;

  const isSelf = currentUserId && currentUserId === user._id;

  const isRequested = Boolean(
    user.hasPendingFollowRequest ||
      user.hasRequestedFollow ||
      user.followRequestPending
  );

  const avatarSrc =
    user.profilePic || makeLocalAvatar(user.fullName || user.username || "User");

  const profilePath = `/profile/${user._id}`;
  const chatPath = `/chat/${user._id}`;

  const statusText = getStatusText(user);

  return (
    <div className="group rounded-[1.35rem] border border-base-300 bg-base-100 p-3 shadow-sm transition hover:bg-base-200/45">
      <div className="flex items-center gap-3">
        <Link to={profilePath} className="relative shrink-0">
          <div className="size-12 overflow-hidden rounded-full bg-base-300">
            <img
              src={avatarSrc}
              alt={user.fullName || "User"}
              className="h-full w-full object-cover"
            />
          </div>

          <StatusDot user={user} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              to={profilePath}
              className="truncate text-sm font-semibold hover:underline"
            >
              {user.fullName || "Unknown user"}
            </Link>

            <UserBadges badges={user.badges || []} compact />

            {user.isPrivate && (
              <LockIcon
                className="size-3.5 shrink-0 text-base-content/45"
                aria-label="Private account"
              />
            )}
          </div>

          <p className="truncate text-xs text-base-content/50">
            @{user.username || "username"}
          </p>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-base-content/45">
            <ClockIcon className="size-3 shrink-0" />

            <span className="truncate">{statusText}</span>

            <span className="shrink-0">·</span>

            <span className="shrink-0">
              {formatCount(user.followerCount)} followers
            </span>
          </div>
        </div>

        {!isSelf && (
          <div className="flex shrink-0 items-center gap-1.5">
            {user.isFollowing && (
              <Link
                to={chatPath}
                className="grid size-9 place-items-center rounded-full text-base-content/55 transition hover:bg-base-300 hover:text-base-content"
                aria-label="Message user"
                title="Message"
              >
                <MessageCircleIcon className="size-4" />
              </Link>
            )}

            {user.isFollowing ? (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3 text-xs font-semibold text-base-content/65 transition hover:bg-base-300 hover:text-base-content disabled:opacity-50"
                onClick={() => onUnfollow?.(user._id)}
                disabled={isBusy}
              >
                <UserMinusIcon className="size-3.5" />
                <span className="hidden sm:inline">Unfollow</span>
              </button>
            ) : (
              <button
                type="button"
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50",
                  isRequested
                    ? "border border-base-300 bg-base-200 text-base-content/50"
                    : "bg-primary text-primary-content hover:bg-primary/90",
                ].join(" ")}
                onClick={() => onFollow?.(user._id)}
                disabled={isBusy || isRequested}
              >
                <UserPlusIcon className="size-3.5" />
                <span>{isRequested ? "Requested" : "Follow"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}