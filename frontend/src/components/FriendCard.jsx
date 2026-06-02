import { Link } from "react-router";
import {
  LockIcon,
  MessageCircleIcon,
  RadioIcon,
} from "lucide-react";

import UserBadges from "./UserBadges";
import { formatLastSeen, getLanguageFlag, makeLocalAvatar } from "../lib/utils";

function cleanLanguage(value) {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function StatusDot({ friend }) {
  const statusClass = friend?.inCall
    ? "bg-warning"
    : friend?.isOnline
    ? "bg-success"
    : "bg-base-content/25";

  const label = friend?.inCall
    ? "In a call"
    : friend?.isOnline
    ? "Online"
    : `Last seen ${formatLastSeen(friend?.lastSeen)}`;

  return (
    <span
      className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-100 ${statusClass}`}
      title={label}
      aria-label={label}
    />
  );
}

const FriendCard = ({ friend }) => {
  if (!friend?._id) return null;

  const avatarSrc =
    friend.profilePic ||
    makeLocalAvatar(friend.fullName || friend.username || "User");

  const nativeLanguage = cleanLanguage(friend.nativeLanguage);
  const learningLanguage = cleanLanguage(friend.learningLanguage);

  const statusText = friend.inCall
    ? "In a call"
    : friend.isOnline
    ? "Online now"
    : `Last seen ${formatLastSeen(friend.lastSeen)}`;

  return (
    <article className="group rounded-[1.35rem] border border-base-300 bg-base-100 p-3 shadow-sm transition hover:bg-base-200/45">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${friend._id}`} className="relative shrink-0">
          <div className="size-12 overflow-hidden rounded-full bg-base-300">
            <img
              src={avatarSrc}
              alt={friend.fullName || "Friend avatar"}
              className="h-full w-full object-cover"
            />
          </div>

          <StatusDot friend={friend} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              to={`/profile/${friend._id}`}
              className="truncate text-sm font-semibold hover:underline"
            >
              {friend.fullName || "Unknown user"}
            </Link>

            <UserBadges badges={friend.badges || []} compact />

            {friend.isPrivate && (
              <LockIcon
                className="size-3.5 shrink-0 text-base-content/45"
                aria-label="Private account"
              />
            )}
          </div>

          <p className="truncate text-xs text-base-content/50">
            @{friend.username || "username"}
          </p>

          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-base-content/45">
            <RadioIcon className="size-3 shrink-0" />
            <span className="truncate">{statusText}</span>
          </p>
        </div>

        <Link
          to={`/chat/${friend._id}`}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/65 transition hover:bg-primary hover:text-primary-content"
          aria-label={`Message ${friend.fullName || "friend"}`}
          title="Message"
        >
          <MessageCircleIcon className="size-5" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-base-200/65 px-3 py-2">
          <p className="text-[0.68rem] font-medium text-base-content/40">
            Native
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold">
            {getLanguageFlag(friend.nativeLanguage)} {nativeLanguage}
          </p>
        </div>

        <div className="rounded-2xl bg-base-200/65 px-3 py-2">
          <p className="text-[0.68rem] font-medium text-base-content/40">
            Learning
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold">
            {getLanguageFlag(friend.learningLanguage)} {learningLanguage}
          </p>
        </div>
      </div>
    </article>
  );
};

export default FriendCard;