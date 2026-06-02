import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router";
import {
  BellIcon,
  MessageCircleIcon,
  ShieldAlertIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { getNotifications } from "../lib/api";

const MAX_SEEN_IDS = 180;
const MAX_NEW_PER_POLL = 3;
const TOAST_DURATION_MS = 3000;
const TOAST_COOLDOWN_MS = 5200;

const popupTypes = new Set([
  "message",
  "message-reply",
  "message-share",
  "follow",
  "follow-request",
  "follow-accepted",
  "comment",
  "comment-reply",
  "comment-like",
  "like",
  "repost",
  "moderation",
  "warning",
  "report",
  "report-update",
  "appeal",
  "appeal-update",
  "staff-message",
  "email-verified",
  "password-reset",
  "system",
]);

function seenStorageKey(userId) {
  return `better-media-seen-notifications-${userId}`;
}

function loadSeenIds(userId) {
  try {
    return new Set(
      JSON.parse(localStorage.getItem(seenStorageKey(userId)) || "[]")
    );
  } catch {
    return new Set();
  }
}

function saveSeenIds(userId, ids) {
  const trimmed = [...ids].slice(-MAX_SEEN_IDS);
  localStorage.setItem(seenStorageKey(userId), JSON.stringify(trimmed));
}

function getActorId(notification) {
  return (
    notification?.actor?._id ||
    notification?.actorId ||
    notification?.sender?._id ||
    notification?.senderId ||
    notification?.from?._id ||
    notification?.from ||
    ""
  );
}

function getActiveChatId(pathname = "") {
  const match = pathname.match(/^\/chat\/([^/?#]+)/);
  return match?.[1] || "";
}

function isMessageNotification(notification) {
  return ["message", "message-reply", "message-share"].includes(notification?.type);
}

function shouldSuppressPopup(notification, pathname) {
  if (!isMessageNotification(notification)) return false;

  const actorId = getActorId(notification);
  const activeChatId = getActiveChatId(pathname);

  if (!actorId || !activeChatId) return false;

  return String(actorId) === String(activeChatId);
}

function notificationPath(notification) {
  const actorId = getActorId(notification);

  if (isMessageNotification(notification) && actorId) {
    return `/chat/${actorId}`;
  }

  if (
    actorId &&
    ["follow", "follow-request", "follow-accepted"].includes(notification.type)
  ) {
    return `/profile/${actorId}`;
  }

  return "/notifications";
}

function NotificationIcon({ type }) {
  const className = "size-4 text-base-content/60";

  if (["message", "message-reply", "message-share"].includes(type)) {
    return <MessageCircleIcon className={className} />;
  }

  if (["follow", "follow-request", "follow-accepted"].includes(type)) {
    return <UserPlusIcon className={className} />;
  }

  if (
    [
      "moderation",
      "warning",
      "report",
      "report-update",
      "appeal",
      "appeal-update",
      "staff-message",
    ].includes(type)
  ) {
    return <ShieldAlertIcon className={className} />;
  }

  return <BellIcon className={className} />;
}

function playSoftNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 620;
    gain.gain.value = 0.0001;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();

    gain.gain.exponentialRampToValueAtTime(
      0.025,
      context.currentTime + 0.015
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.13
    );

    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // Sound is optional.
  }
}

function showBrowserNotification(notification) {
  if (!("Notification" in window)) return;
  if (!document.hidden) return;
  if (Notification.permission !== "granted") return;

  new Notification(notification.title || "MEDIA", {
    body: notification.message || "You have a new update.",
    icon: notification.actor?.profilePic || undefined,
    silent: true,
  });
}

function NotificationAvatar({ notification }) {
  const actor = notification.actor;

  if (actor?.profilePic) {
    return (
      <div className="size-9 shrink-0 overflow-hidden rounded-full bg-base-300">
        <img
          src={actor.profilePic}
          alt={actor.fullName || "User"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-base-200">
      <NotificationIcon type={notification.type} />
    </div>
  );
}

function LiveToast({ notification, extraCount, toastState }) {
  const path = notificationPath(notification);

  return (
    <div
      className={[
        "pointer-events-auto w-[min(19.5rem,calc(100vw-1.25rem))]",
        "transition-all duration-300 ease-out",
        toastState.visible
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-8 opacity-0 scale-[0.98]",
      ].join(" ")}
    >
      <div className="overflow-hidden rounded-2xl border border-base-300/70 bg-base-100/90 text-base-content shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link to={path} className="shrink-0">
            <NotificationAvatar notification={notification} />
          </Link>

          <Link to={path} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-5">
              {notification.title || "New notification"}
            </p>

            <p className="truncate text-xs text-base-content/55">
              {notification.message || "Open MEDIA to view it."}
            </p>

            {extraCount > 0 && (
              <p className="mt-0.5 text-xs text-base-content/45">
                +{extraCount} more
              </p>
            )}
          </Link>

          <button
            type="button"
            className="grid size-7 shrink-0 place-items-center rounded-full text-base-content/45 hover:bg-base-200 hover:text-base-content"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toast.dismiss(toastState.id);
            }}
            aria-label="Close notification"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiveNotificationToasts({ authUser, enabled }) {
  const location = useLocation();
  const userId = authUser?._id;

  const initializedRef = useRef(false);
  const seenRef = useRef(new Set());
  const lastToastAtRef = useRef(0);

  const { data: notifications = [] } = useQuery({
    queryKey: ["liveNotifications", userId],
    queryFn: getNotifications,
    enabled: Boolean(enabled && userId),
    refetchInterval: 6500,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    initializedRef.current = false;
    lastToastAtRef.current = 0;
    seenRef.current = userId ? loadSeenIds(userId) : new Set();
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const validNotifications = (notifications || []).filter((notification) =>
      Boolean(notification?._id)
    );

    const currentIds = validNotifications.map((notification) => notification._id);

    if (!initializedRef.current) {
      currentIds.forEach((id) => seenRef.current.add(id));
      saveSeenIds(userId, seenRef.current);
      initializedRef.current = true;
      return;
    }

    const newNotifications = validNotifications
      .filter((notification) => popupTypes.has(notification.type))
      .filter((notification) => !seenRef.current.has(notification._id))
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .slice(-MAX_NEW_PER_POLL);

    if (newNotifications.length === 0) {
      currentIds.forEach((id) => seenRef.current.add(id));
      saveSeenIds(userId, seenRef.current);
      return;
    }

    newNotifications.forEach((notification) => {
      seenRef.current.add(notification._id);
    });

    currentIds.forEach((id) => seenRef.current.add(id));
    saveSeenIds(userId, seenRef.current);

    const toastableNotifications = newNotifications.filter(
      (notification) => !shouldSuppressPopup(notification, location.pathname)
    );

    if (toastableNotifications.length === 0) {
      return;
    }

    const now = Date.now();
    const cooldownActive = now - lastToastAtRef.current < TOAST_COOLDOWN_MS;

    if (cooldownActive) return;

    lastToastAtRef.current = now;

    const mainNotification =
      toastableNotifications[toastableNotifications.length - 1];

    const extraCount = Math.max(0, toastableNotifications.length - 1);

    playSoftNotificationSound();
    showBrowserNotification(mainNotification);

    toast.custom(
      (toastState) => (
        <LiveToast
          notification={mainNotification}
          extraCount={extraCount}
          toastState={toastState}
        />
      ),
      {
        id: "live-notification-side-toast",
        duration: TOAST_DURATION_MS,
        position: "top-right",
      }
    );
  }, [enabled, notifications, userId, location.pathname]);

  return null;
}
