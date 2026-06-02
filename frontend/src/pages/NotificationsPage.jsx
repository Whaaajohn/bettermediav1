import { createElement, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  BellIcon,
  CheckIcon,
  FlagIcon,
  MailCheckIcon,
  MessageCircleIcon,
  PhoneIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserCheckIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import NoNotificationsFound from "../components/NoNotificationsFound";
import {
  acceptFollowRequest,
  deleteCallHistory,
  deleteNotification,
  declineFollowRequest,
  getCallHistory,
  getFollowRequests,
  getNotifications,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { getApiErrorMessage } from "../lib/errors";

const socialTypes = [
  "follow",
  "follow-request",
  "follow-accepted",
  "comment",
  "comment-reply",
  "comment-like",
  "reply",
  "like",
  "repost",
];

const messageTypes = ["message", "message-reply", "message-share"];

const moderationTypes = [
  "moderation",
  "warning",
  "report",
  "report-update",
  "appeal",
  "appeal-update",
  "staff-message",
];

const securityTypes = ["email-verified", "password-reset", "login-alert", "system"];

const tabs = [
  ["all", "All"],
  ["requests", "Requests"],
  ["calls", "Calls"],
  ["social", "Social"],
  ["messages", "Messages"],
  ["security", "Security"],
];

function formatTime(date) {
  if (!date) return "";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  const today = value.toDateString() === new Date().toDateString();

  if (today) {
    return value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return value.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getNotificationGroup(type) {
  if (socialTypes.includes(type)) return "social";
  if (messageTypes.includes(type)) return "messages";
  if (moderationTypes.includes(type)) return "moderation";
  if (securityTypes.includes(type)) return "security";
  return "other";
}

function getGroupTitle(group) {
  if (group === "social") return "Social";
  if (group === "messages") return "Messages";
  if (group === "moderation") return "Moderation";
  if (group === "security") return "Security";
  return "Other";
}

function getGroupIcon(group) {
  if (group === "social") return UserCheckIcon;
  if (group === "messages") return MessageCircleIcon;
  if (group === "moderation") return ShieldAlertIcon;
  if (group === "security") return MailCheckIcon;
  return BellIcon;
}

function AvatarCircle({ user, fallbackIcon: FallbackIcon = BellIcon, to }) {
  const content = user?.profilePic ? (
    <img
      src={user.profilePic}
      alt={user.fullName || "User"}
      className="h-full w-full object-cover"
    />
  ) : user?.fullName ? (
    <span className="text-xs font-semibold text-base-content/70">
      {getInitials(user.fullName)}
    </span>
  ) : (
    createElement(FallbackIcon, { className: "size-5 text-base-content/50" })
  );

  const avatar = (
    <div className="size-11 shrink-0 overflow-hidden rounded-full bg-base-200 grid place-items-center">
      {content}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="shrink-0">
        {avatar}
      </Link>
    );
  }

  return avatar;
}

function SegmentedTabs({ activeTab, setActiveTab, counts }) {
  return (
    <div
      className="grid gap-1 rounded-2xl border border-base-300 bg-base-200/55 p-1 shadow-sm"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setActiveTab(value)}
          className={`h-9 rounded-xl text-xs font-bold transition sm:text-sm ${
            activeTab === value
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
              : "text-base-content/50 hover:bg-base-100/70 hover:text-base-content"
          }`}
        >
          <span>{label}</span>
          {counts?.[value] > 0 && (
            <span className="ml-1 text-[10px] opacity-60">{counts[value]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <div className="flex items-center gap-2">
        {createElement(Icon, { className: "size-4 text-primary" })}
        <h2 className="text-sm font-semibold text-base-content/80">{title}</h2>
      </div>

      {count > 0 && (
        <span className="text-xs text-base-content/45">{count}</span>
      )}
    </div>
  );
}

function FollowRequestRow({
  request,
  busy,
  onAccept,
  onDecline,
}) {
  const sender = request.sender;

  return (
    <div className="flex items-center gap-3 px-3 py-3 hover:bg-base-200/70 transition">
      <AvatarCircle
        user={sender}
        fallbackIcon={UserCheckIcon}
        to={sender?._id ? `/profile/${sender._id}` : undefined}
      />

      <Link
        to={sender?._id ? `/profile/${sender._id}` : "#"}
        className="min-w-0 flex-1"
      >
        <p className="font-semibold truncate">
          {sender?.fullName || "Unknown user"}
        </p>
        <p className="text-sm text-base-content/60 truncate">
          wants to follow your private account
        </p>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          className="btn btn-primary btn-xs btn-circle"
          onClick={() => onAccept(request._id)}
          disabled={busy}
          aria-label="Accept request"
        >
          {busy ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <CheckIcon className="size-3.5" />
          )}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle"
          onClick={() => onDecline(request._id)}
          disabled={busy}
          aria-label="Decline request"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function CallRow({ call, authUser, deleting, onDelete }) {
  const other = call.caller?._id === authUser?._id ? call.callee : call.caller;
  const callId = call.callId || call._id;

  return (
    <div className="flex items-center gap-3 px-3 py-3 hover:bg-base-200/70 transition">
      <AvatarCircle
        user={other}
        fallbackIcon={PhoneIcon}
        to={other?._id ? `/profile/${other._id}` : undefined}
      />

      <Link
        to={other?._id ? `/chat/${other._id}` : "/notifications"}
        className="min-w-0 flex-1"
      >
        <p className="font-semibold capitalize truncate">
          {call.status || "Call"}
        </p>
        <p className="text-sm text-base-content/60 truncate">
          {other?.fullName ? `With ${other.fullName}` : "Unknown caller"} •{" "}
          {call.durationSeconds || 0}s
        </p>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:block text-xs text-base-content/45">
          {formatTime(call.createdAt)}
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle"
          onClick={() => onDelete(callId)}
          disabled={deleting}
          aria-label="Delete call"
        >
          {deleting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Trash2Icon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function NotificationRow({ notification, deleting, onDelete }) {
  const group = getNotificationGroup(notification.type);
  const Icon = getGroupIcon(group);
  const actor = notification.actor;

  return (
    <div className="flex items-start gap-3 px-3 py-3 hover:bg-base-200/70 transition">
      <AvatarCircle
        user={actor}
        fallbackIcon={Icon}
        to={actor?._id ? `/profile/${actor._id}` : undefined}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold truncate">
            {notification.title || "Notification"}
          </p>

          {notification.type && (
            <span className="hidden sm:inline text-[11px] rounded-full border border-base-300 px-2 py-0.5 text-base-content/50 shrink-0">
              {notification.type}
            </span>
          )}
        </div>

        {notification.message && (
          <p className="text-sm text-base-content/65 line-clamp-2">
            {notification.message}
          </p>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          {actor?.username && (
            <Link
              to={`/profile/${actor._id}`}
              className="text-xs text-primary hover:underline"
            >
              @{actor.username}
            </Link>
          )}

          <span className="text-xs text-base-content/40">
            {formatTime(notification.createdAt)}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-xs btn-circle shrink-0"
        onClick={() => onDelete(notification._id)}
        disabled={deleting}
        aria-label="Delete notification"
      >
        {deleting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Trash2Icon className="size-3.5" />
        )}
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [busyFollowId, setBusyFollowId] = useState(null);
  const [deletingNotificationId, setDeletingNotificationId] = useState(null);
  const [deletingCallId, setDeletingCallId] = useState(null);

  const {
    data: followRequests,
    isLoading: followLoading,
    error: followError,
  } = useQuery({
    queryKey: ["followRequests"],
    queryFn: getFollowRequests,
    refetchInterval: 4000,
  });

  const {
    data: callHistory = [],
    isLoading: callsLoading,
    error: callsError,
  } = useQuery({
    queryKey: ["callHistory"],
    queryFn: getCallHistory,
    refetchInterval: 5000,
  });

  const {
    data: localNotifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 4000,
  });

  const isLoading = followLoading || callsLoading || notificationsLoading;
  const pageError = followError || callsError || notificationsError;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    queryClient.invalidateQueries({ queryKey: ["callHistory"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  const { mutate: acceptMutation } = useMutation({
    mutationFn: acceptFollowRequest,
    onSuccess: () => {
      toast.success("Follow request accepted");
      refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not accept request"));
    },
    onSettled: () => setBusyFollowId(null),
  });

  const { mutate: declineMutation } = useMutation({
    mutationFn: declineFollowRequest,
    onSuccess: () => {
      toast.success("Follow request declined");
      refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not decline request"));
    },
    onSettled: () => setBusyFollowId(null),
  });

  const { mutate: deleteNotificationMutation } = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not delete notification"));
    },
    onSettled: () => setDeletingNotificationId(null),
  });

  const { mutate: deleteCallMutation } = useMutation({
    mutationFn: deleteCallHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callHistory"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not delete call"));
    },
    onSettled: () => setDeletingCallId(null),
  });

  const incomingRequests = followRequests?.incomingFollowReqs || [];

  const searchedRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return incomingRequests.filter((request) => {
      if (!q) return true;

      return [
        request.sender?.fullName,
        request.sender?.username,
        "follow request",
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [incomingRequests, search]);

  const searchedCalls = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (callHistory || [])
      .filter((call) => {
        const other =
          call.caller?._id === authUser?._id ? call.callee : call.caller;

        if (!q) return true;

        return [other?.fullName, other?.username, call.status, "call"]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q));
      })
      .slice(0, 30);
  }, [callHistory, search, authUser]);

  const searchedNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (localNotifications || [])
      .filter((notification) => {
        if (!q) return true;

        return [
          notification.title,
          notification.message,
          notification.type,
          notification.actor?.fullName,
          notification.actor?.username,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q));
      })
      .slice(0, 80);
  }, [localNotifications, search]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return searchedNotifications;
    if (activeTab === "social") {
      return searchedNotifications.filter((item) => socialTypes.includes(item.type));
    }
    if (activeTab === "messages") {
      return searchedNotifications.filter((item) => messageTypes.includes(item.type));
    }
    if (activeTab === "security") {
      return searchedNotifications.filter((item) => securityTypes.includes(item.type));
    }

    return [];
  }, [searchedNotifications, activeTab]);

  const groupedNotifications = useMemo(() => {
    const groups = {};

    filteredNotifications.forEach((notification) => {
      const group = getNotificationGroup(notification.type);
      if (!groups[group]) groups[group] = [];
      groups[group].push(notification);
    });

    return Object.entries(groups).map(([group, items]) => ({
      group,
      title: getGroupTitle(group),
      icon: getGroupIcon(group),
      items,
    }));
  }, [filteredNotifications]);

  const counts = {
    all:
      incomingRequests.length + callHistory.length + localNotifications.length,
    requests: incomingRequests.length,
    calls: callHistory.length,
    social: localNotifications.filter((item) => socialTypes.includes(item.type)).length,
    messages: localNotifications.filter((item) => messageTypes.includes(item.type)).length,
    security: localNotifications.filter((item) => securityTypes.includes(item.type)).length,
  };

  const showRequests = activeTab === "all" || activeTab === "requests";
  const showCalls = activeTab === "all" || activeTab === "calls";
  const showNotifications =
    activeTab === "all" || activeTab === "social" || activeTab === "messages" || activeTab === "security";

  const visibleCount =
    (showRequests ? searchedRequests.length : 0) +
    (showCalls ? searchedCalls.length : 0) +
    (showNotifications ? filteredNotifications.length : 0);

  const handleAccept = (requestId) => {
    setBusyFollowId(requestId);
    acceptMutation(requestId);
  };

  const handleDecline = (requestId) => {
    setBusyFollowId(requestId);
    declineMutation(requestId);
  };

  const handleDeleteNotification = (notificationId) => {
    setDeletingNotificationId(notificationId);
    deleteNotificationMutation(notificationId);
  };

  const handleDeleteCall = (callId) => {
    setDeletingCallId(callId);
    deleteCallMutation(callId);
  };

  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {counts.requests} requests • {counts.calls} calls •{" "}
              {localNotifications.length} updates
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={refresh}
            aria-label="Refresh notifications"
          >
            <RefreshCwIcon className="size-4" />
          </button>
        </header>

        <div className="space-y-3">
          <label className="input input-bordered flex items-center gap-2 rounded-xl bg-base-100">
            <SearchIcon className="size-4 text-base-content/45" />
            <input
              className="grow"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
            />
          </label>

          <SegmentedTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            counts={counts}
          />
        </div>

        {pageError && (
          <div className="alert alert-error">
            <span>
              {getApiErrorMessage(pageError, "Could not load notifications")}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : visibleCount === 0 ? (
          <div className="rounded-2xl border border-base-300 bg-base-100 py-14 text-center">
            <BellIcon className="size-9 mx-auto opacity-40 mb-2" />
            {search.trim() ? (
              <>
                <p className="font-medium">No matching notifications</p>
                <p className="text-sm text-base-content/50">
                  Try another search or tab.
                </p>
              </>
            ) : (
              <NoNotificationsFound />
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {showRequests && searchedRequests.length > 0 && (
              <section className="space-y-2">
                <SectionTitle
                  icon={UserCheckIcon}
                  title="Follow requests"
                  count={searchedRequests.length}
                />

                <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 divide-y divide-base-300">
                  {searchedRequests.map((request) => (
                    <FollowRequestRow
                      key={request._id}
                      request={request}
                      busy={busyFollowId === request._id}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </div>
              </section>
            )}

            {showCalls && searchedCalls.length > 0 && (
              <section className="space-y-2">
                <SectionTitle
                  icon={PhoneIcon}
                  title="Calls"
                  count={searchedCalls.length}
                />

                <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 divide-y divide-base-300">
                  {searchedCalls.map((call) => {
                    const callId = call.callId || call._id;

                    return (
                      <CallRow
                        key={call._id}
                        call={call}
                        authUser={authUser}
                        deleting={deletingCallId === callId}
                        onDelete={handleDeleteCall}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {showNotifications &&
              groupedNotifications.map((section) => {
                const Icon = section.icon;

                return (
                  <section key={section.group} className="space-y-2">
                    <SectionTitle
                      icon={Icon}
                      title={section.title}
                      count={section.items.length}
                    />

                    <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 divide-y divide-base-300">
                      {section.items.map((notification) => (
                        <NotificationRow
                          key={notification._id}
                          notification={notification}
                          deleting={
                            deletingNotificationId === notification._id
                          }
                          onDelete={handleDeleteNotification}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
