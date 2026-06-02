import { createElement, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  MicIcon,
  MessageCircleIcon,
  PhoneIcon,
  PhoneMissedIcon,
  SearchIcon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import UserBadges from "../components/UserBadges";
import useAuthUser from "../hooks/useAuthUser";
import {
  deleteCallHistory,
  getCallHistory,
  getConversations,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { formatLastSeen, makeLocalAvatar } from "../lib/utils";

const tabs = [
  ["all", "All"],
  ["unread", "Unread"],
  ["online", "Online"],
  ["calls", "Calls"],
];

function formatTime(date) {
  if (!date) return "";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  const now = new Date();
  const today = value.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const wasYesterday = value.toDateString() === yesterday.toDateString();

  if (today) {
    return value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (wasYesterday) return "Yesterday";

  return value.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return "0s";

  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);

  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function getMessageSenderId(message) {
  return (
    message?.sender?._id ||
    message?.sender ||
    message?.senderId ||
    message?.from ||
    ""
  );
}

function getVoiceDuration(message) {
  return (
    message?.voiceDuration ||
    message?.duration ||
    message?.durationSeconds ||
    message?.audioDuration ||
    0
  );
}

function messageWasEdited(message) {
  return Boolean(
    message?.editedAt ||
      message?.isEdited ||
      message?.edited ||
      message?.editHistory?.length
  );
}

function getPreviewParts(conversation, authUser) {
  const message = conversation?.lastMessage;
  const user = conversation?.user;

  if (!message) {
    if (user?.isOnline) {
      return {
        icon: null,
        text: "Online now",
        muted: false,
      };
    }

    return {
      icon: null,
      text: `Last seen ${formatLastSeen(user?.lastSeen)}`,
      muted: true,
    };
  }

  if (message.deletedAt) {
    return {
      icon: null,
      text: "Message deleted",
      muted: true,
    };
  }

  const mine = getMessageSenderId(message) === authUser?._id;
  const prefix = mine ? "You: " : "";
  const edited = messageWasEdited(message) ? " · edited" : "";

  if (message.text) {
    return {
      icon: null,
      text: `${prefix}${message.text}${edited}`,
      muted: false,
    };
  }

  if (message.voice || message.audio || message.voiceUrl || message.audioUrl) {
    const duration = formatDuration(getVoiceDuration(message));

    return {
      icon: MicIcon,
      text: `${prefix}Voice message · ${duration}${edited}`,
      muted: false,
    };
  }

  if (message.media || message.image || message.imageUrl || message.video) {
    return {
      icon: message.video ? VideoIcon : null,
      text: `${prefix}${message.video ? "Video" : "Photo"}${edited}`,
      muted: false,
    };
  }

  if (message.attachment || message.file || message.fileUrl) {
    return {
      icon: null,
      text: `${prefix}Attachment${edited}`,
      muted: false,
    };
  }

  return {
    icon: null,
    text: `${prefix}New message${edited}`,
    muted: false,
  };
}

function Avatar({ user, size = "size-12" }) {
  const src =
    user?.profilePic ||
    makeLocalAvatar(user?.fullName || user?.username || "User");

  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-full bg-base-300`}>
      <img
        src={src}
        alt={user?.fullName || "User"}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function StatusDot({ user }) {
  const statusClass = user?.inCall
    ? "bg-warning"
    : user?.isOnline
    ? "bg-success"
    : "bg-base-content/25";

  return (
    <span
      className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-100 ${statusClass}`}
    />
  );
}

function SegmentedTabs({ activeTab, setActiveTab, counts }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-2xl border border-base-300 bg-base-200/55 p-1 shadow-sm">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setActiveTab(value)}
          className={`h-9 rounded-xl text-sm font-bold transition ${
            activeTab === value
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
              : "text-base-content/50 hover:bg-base-100/70 hover:text-base-content"
          }`}
        >
          <span>{label}</span>
          {counts?.[value] > 0 && (
            <span className="ml-1 text-[10px] opacity-50">{counts[value]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-base-200">
        {createElement(Icon, { className: "size-6 text-base-content/40" })}
      </div>

      <p className="mt-3 font-semibold">{title}</p>

      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-base-content/50">
          {description}
        </p>
      )}
    </div>
  );
}

function ConversationRow({ conversation, authUser }) {
  const user = conversation.user;
  const unread = conversation.unreadCount || 0;
  const preview = getPreviewParts(conversation, authUser);
  const PreviewIcon = preview.icon;

  const time = formatTime(
    conversation.lastMessage?.createdAt || conversation.updatedAt
  );

  return (
    <Link
      to={`/chat/${user._id}`}
      className="group flex items-center gap-3 px-3 py-3 transition hover:bg-base-200/60 sm:px-4"
    >
      <div className="relative">
        <Avatar user={user} size="size-12 sm:size-13" />
        <StatusDot user={user} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold sm:text-base">
            {user.fullName || "Unknown user"}
          </h2>

          <UserBadges badges={user.badges || []} compact />

          {time && (
            <span className="ml-auto shrink-0 text-xs text-base-content/45">
              {time}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          {PreviewIcon && (
            <PreviewIcon
              className={`size-3.5 shrink-0 ${
                unread > 0 ? "text-primary" : "text-base-content/40"
              }`}
            />
          )}

          <p
            className={`truncate text-sm ${
              unread > 0
                ? "font-medium text-base-content"
                : preview.muted
                ? "text-base-content/45"
                : "text-base-content/60"
            }`}
          >
            {preview.text}
          </p>

          {unread > 0 && (
            <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-content">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getCallTone(call) {
  const status = String(call?.status || "").toLowerCase();

  if (status.includes("miss") || status.includes("decline") || status.includes("fail")) {
    return "error";
  }

  if (status.includes("ended") || status.includes("complete")) {
    return "neutral";
  }

  return "success";
}

function CallRow({ call, authUser, onDelete, deleting }) {
  const other = call.caller?._id === authUser?._id ? call.callee : call.caller;
  const callId = call.callId || call._id;
  const tone = getCallTone(call);
  const status = call.status || "call";
  const isVideo = call.mode === "video" || call.type === "video";

  const iconClass =
    tone === "error"
      ? "text-error"
      : tone === "success"
      ? "text-success"
      : "text-base-content/50";

  const Icon = tone === "error" ? PhoneMissedIcon : isVideo ? VideoIcon : PhoneIcon;

  return (
    <div className="group flex items-center gap-3 px-3 py-3 transition hover:bg-base-200/60 sm:px-4">
      {other?._id ? (
        <Link to={`/profile/${other._id}`} className="relative shrink-0">
          <Avatar user={other} size="size-11" />
        </Link>
      ) : (
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-base-200">
          <Icon className={`size-5 ${iconClass}`} />
        </div>
      )}

      <Link
        to={other?._id ? `/chat/${other._id}` : "/messages"}
        className="min-w-0 flex-1"
      >
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold sm:text-base">
            {other?.fullName || "Unknown call"}
          </p>

          <Icon className={`size-3.5 shrink-0 ${iconClass}`} />
        </div>

        <p className="truncate text-sm capitalize text-base-content/55">
          {status} · {formatDuration(call.durationSeconds)}
        </p>
      </Link>

      <div className="flex items-center gap-1.5">
        <p className="hidden text-xs text-base-content/45 sm:block">
          {formatTime(call.createdAt)}
        </p>

        <button
          type="button"
          className="grid size-8 place-items-center rounded-full text-base-content/45 opacity-100 transition hover:bg-base-300 hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onDelete(callId)}
          disabled={deleting}
          aria-label="Delete call"
        >
          {deleting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deletingCallId, setDeletingCallId] = useState(null);

  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
    staleTime: 1500,
    retry: 1,
  });

  const {
    data: callHistory = [],
    isLoading: callsLoading,
    error: callsError,
  } = useQuery({
    queryKey: ["callHistory"],
    queryFn: getCallHistory,
    refetchInterval: activeTab === "calls" ? 5000 : false,
    refetchIntervalInBackground: false,
    staleTime: 3000,
    retry: 1,
  });

  const { mutate: deleteCallMutation } = useMutation({
    mutationFn: deleteCallHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callHistory"] });
      toast.success("Call removed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not delete call"));
    },
    onSettled: () => setDeletingCallId(null),
  });

  const cleanConversations = useMemo(() => {
    return (conversations || []).filter((conversation) => conversation?.user?._id);
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cleanConversations
      .filter((conversation) => {
        const user = conversation.user;
        const preview = getPreviewParts(conversation, authUser).text;

        if (!q) return true;

        return [user.fullName, user.username, user.email, preview]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .filter((conversation) => {
        const user = conversation.user;

        if (activeTab === "all") return true;
        if (activeTab === "unread") return (conversation.unreadCount || 0) > 0;
        if (activeTab === "online") return Boolean(user.isOnline);
        if (activeTab === "calls") return false;

        return true;
      })
      .sort((a, b) => {
        const unreadA = a.unreadCount || 0;
        const unreadB = b.unreadCount || 0;

        if (unreadA !== unreadB) return unreadB - unreadA;

        const timeA = new Date(
          a.lastMessage?.createdAt || a.updatedAt || 0
        ).getTime();

        const timeB = new Date(
          b.lastMessage?.createdAt || b.updatedAt || 0
        ).getTime();

        return timeB - timeA;
      });
  }, [cleanConversations, search, activeTab, authUser]);

  const filteredCalls = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (callHistory || [])
      .filter((call) => {
        const other =
          call.caller?._id === authUser?._id ? call.callee : call.caller;

        if (!q) return true;

        return [other?.fullName, other?.username, call.status, call.mode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .slice(0, 40);
  }, [callHistory, search, authUser]);

  const counts = {
    all: cleanConversations.length,
    unread: cleanConversations.filter(
      (conversation) => (conversation.unreadCount || 0) > 0
    ).length,
    online: cleanConversations.filter(
      (conversation) => conversation.user?.isOnline
    ).length,
    calls: callHistory.length,
  };

  const handleDeleteCall = (callId) => {
    if (!callId || deletingCallId) return;
    setDeletingCallId(callId);
    deleteCallMutation(callId);
  };

  const pageError = error || callsError;
  const hasSearch = search.trim().length > 0;

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-base-content/55">
            {counts.all} chats · {counts.unread} unread · {counts.online} online
          </p>
        </header>

        <section className="sticky top-0 z-10 -mx-1 space-y-3 bg-base-100/85 px-1 py-2 backdrop-blur-xl">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />

            <input
              className="input input-bordered h-11 w-full rounded-2xl bg-base-100 pl-11 pr-11 shadow-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />

            {search && (
              <button
                type="button"
                className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-base-content/40 hover:bg-base-200 hover:text-base-content"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          <SegmentedTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            counts={counts}
          />
        </section>

        {pageError && (
          <div className="rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error">
            {getApiErrorMessage(pageError, "Could not load messages")}
          </div>
        )}

        <section className="overflow-hidden rounded-[1.4rem] border border-base-300 bg-base-100 shadow-sm">
          {activeTab === "calls" ? (
            callsLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : filteredCalls.length === 0 ? (
              <EmptyState
                icon={PhoneIcon}
                title={hasSearch ? "No calls found" : "No calls yet"}
                description={
                  hasSearch
                    ? "Try a different name or call status."
                    : "Your call history will show here."
                }
              />
            ) : (
              <div className="divide-y divide-base-300">
                {filteredCalls.map((call) => {
                  const callId = call.callId || call._id;

                  return (
                    <CallRow
                      key={call._id || callId}
                      call={call}
                      authUser={authUser}
                      onDelete={handleDeleteCall}
                      deleting={deletingCallId === callId}
                    />
                  );
                })}
              </div>
            )
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <EmptyState
              icon={MessageCircleIcon}
              title={hasSearch ? "No messages found" : "No messages yet"}
              description={
                hasSearch
                  ? "Try a different name, username, or message."
                  : "Your conversations will appear here once you start chatting."
              }
            />
          ) : (
            <div className="divide-y divide-base-300">
              {filteredConversations.map((conversation) => (
                <ConversationRow
                  key={conversation.user._id}
                  conversation={conversation}
                  authUser={authUser}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
