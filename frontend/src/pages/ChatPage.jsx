import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckCheckIcon,
  FileIcon,
  FlagIcon,
  ImageIcon,
  LoaderIcon,
  MicIcon,
  PencilIcon,
  ReplyIcon,
  SearchIcon,
  SendIcon,
  SmilePlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import CallButton from "../components/CallButton";
import ChatLoader from "../components/ChatLoader";
import UserBadges from "../components/UserBadges";
import useAuthUser from "../hooks/useAuthUser";
import useCall from "../hooks/useCall";
import {
  createReport,
  blockUser,
  deleteMessage,
  editMessage,
  getMessages,
  getUserProfile,
  searchGifs,
  sendMessage,
  toggleMessageReaction,
  unblockUser,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { promptReport } from "../lib/reports";
import { fileToDataUrl, makeLocalAvatar } from "../lib/utils";

const KLIPY_ATTRIBUTION_URL = "https://klipy.com";
const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"];

function getMessageSenderId(message) {
  return message?.sender?._id || message?.sender || message?.senderId || "";
}

function isMessageMine(message, authUser) {
  return String(getMessageSenderId(message)) === String(authUser?._id);
}

function makeClientId(prefix = "message") {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${random}`;
}

function normalizeKlipyItem(item, mode = "gifs") {
  const images = item?.images || {};

  const previewUrl =
    item?.previewUrl ||
    item?.preview ||
    item?.downsizedUrl ||
    images?.fixed_width?.url ||
    images?.fixed_height?.url ||
    images?.downsized?.url ||
    images?.downsized_medium?.url ||
    item?.url ||
    "";

  const url =
    item?.url ||
    item?.originalUrl ||
    images?.original?.url ||
    images?.downsized_medium?.url ||
    previewUrl;

  return {
    id: item?.id || `${mode}-${url}`,
    title: item?.title || (mode === "stickers" ? "KLIPY Sticker" : "KLIPY GIF"),
    url,
    previewUrl,
    source: item?.source || "klipy",
    provider: item?.provider || "klipy",
    type: mode === "stickers" ? "sticker" : "gif",
    providerUrl: item?.providerUrl || item?.itemurl || item?.embed_url || "",
  };
}

function PoweredByKlipy({ compact = false }) {
  return (
    <div
      className={[
        "flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-base-content/45",
        compact ? "justify-end" : "justify-between",
      ].join(" ")}
      aria-label="Powered by KLIPY"
    >
      {!compact && <span>GIFs & Stickers</span>}

      <a
        href={KLIPY_ATTRIBUTION_URL}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-base-300 px-2 py-0.5 text-base-content/55 transition hover:border-cyan-400/40 hover:text-cyan-200"
      >
        Powered by KLIPY
      </a>
    </div>
  );
}

function MessageSharedPostPreview({ post, isMine }) {
  if (!post) return null;

  if (post.unavailable) {
    return (
      <div className="mt-2 rounded-2xl border border-base-content/15 bg-base-100/20 p-3 text-xs">
        <p className="font-semibold">Original post unavailable</p>
        <p className="mt-1 opacity-70">
          This post is archived, deleted, private, or blocked for this account.
        </p>
      </div>
    );
  }

  const author = post.author || {};
  const imageUrl =
    typeof post.thumbnail === "string"
      ? post.thumbnail
      : post.thumbnail?.url || post.media?.url || "";
  const authorAvatar =
    author.profilePic || makeLocalAvatar(author.fullName || author.username || "User");

  return (
    <div
      className={[
        "mt-2 overflow-hidden rounded-2xl border border-base-content/15 text-left",
        isMine ? "bg-primary-content/10" : "bg-base-100",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 border-b border-base-content/10 px-3 py-2">
        <Link
          to={author._id ? `/profile/${author._id}` : "#"}
          className="size-7 shrink-0 overflow-hidden rounded-full bg-base-300"
        >
          <img
            src={authorAvatar}
            alt={author.fullName || "Post author"}
            className="h-full w-full object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              to={author._id ? `/profile/${author._id}` : "#"}
              className="truncate text-xs font-semibold hover:underline"
            >
              {author.username || author.fullName || "user"}
            </Link>
            <UserBadges badges={author.badges || []} compact />
          </div>
          <p className="text-[0.65rem] opacity-60">Shared post</p>
        </div>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Shared post preview"
          className="max-h-44 w-full object-cover"
        />
      )}

      {post.text && (
        <p className="line-clamp-4 whitespace-pre-wrap px-3 py-2 text-xs leading-5">
          {post.text}
        </p>
      )}
    </div>
  );
}

function KlipyPicker({
  open,
  mode,
  setMode,
  query,
  setQuery,
  results,
  isLoading,
  onClose,
  onSelect,
}) {
  if (!open) return null;

  return (
    <section className="absolute bottom-[calc(100%+0.75rem)] left-0 z-40 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-base-300 bg-base-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-base-300 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-full bg-base-200 text-base-content/60">
            <SparklesIcon className="size-4" />
          </div>

          <div>
            <p className="text-sm font-semibold">KLIPY</p>
            <p className="text-xs text-base-content/45">GIFs and stickers</p>
          </div>
        </div>

        <button
          type="button"
          className="grid size-8 place-items-center rounded-full text-base-content/45 hover:bg-base-200 hover:text-base-content"
          onClick={onClose}
          aria-label="Close KLIPY picker"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-base-300 bg-base-200/70 p-1">
          {[
            ["gifs", "GIFs"],
            ["stickers", "Stickers"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={[
                "h-9 rounded-xl text-sm font-semibold transition",
                mode === value
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/50 hover:bg-base-100/50 hover:text-base-content",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />

          <input
            className="input input-bordered h-10 w-full rounded-2xl bg-base-100 pl-10 pr-10 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search KLIPY ${mode === "stickers" ? "stickers" : "GIFs"}`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            autoFocus
          />

          {query && (
            <button
              type="button"
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-base-content/40 hover:bg-base-200 hover:text-base-content"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <div className="h-64 overflow-y-auto rounded-2xl border border-base-300 bg-base-200/35 p-2">
          {query.trim().length <= 1 ? (
            <div className="grid h-full place-items-center px-4 text-center">
              <div>
                <p className="text-sm font-semibold">Search KLIPY</p>
                <p className="mt-1 text-xs text-base-content/50">
                  Search reactions, memes, stickers, or emotions.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="grid h-full place-items-center">
              <LoaderIcon className="size-6 animate-spin text-base-content/45" />
            </div>
          ) : results.length === 0 ? (
            <div className="grid h-full place-items-center px-4 text-center">
              <div>
                <p className="text-sm font-semibold">No results found</p>
                <p className="mt-1 text-xs text-base-content/50">
                  Try a different search.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-base-300 bg-base-100 transition hover:scale-[0.98]"
                  onClick={() => onSelect(gif)}
                  title={gif.title}
                >
                  <img
                    src={gif.previewUrl || gif.url}
                    alt={gif.title}
                    loading="lazy"
                    className={[
                      "h-full w-full",
                      gif.type === "sticker" ? "object-contain p-1" : "object-cover",
                    ].join(" ")}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <PoweredByKlipy />
      </div>
    </section>
  );
}

function MessageGif({ gif }) {
  const normalized = normalizeKlipyItem(
    gif,
    gif?.type === "sticker" ? "stickers" : "gifs"
  );

  if (!normalized.url) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-base-content/10 bg-black/5">
      <img
        src={normalized.url}
        alt={normalized.title || "KLIPY media"}
        className={[
          "max-h-64 max-w-xs",
          normalized.type === "sticker" ? "object-contain p-2" : "object-cover",
        ].join(" ")}
        loading="lazy"
      />

      <div className="border-t border-base-content/10 bg-base-100/80 px-2 py-1">
        <PoweredByKlipy compact />
      </div>
    </div>
  );
}

function InlineEditHistory({ message, isMine }) {
  const history = message.editHistory || [];

  if (!message.editedAt) return null;

  const lastEdit = history[history.length - 1];

  return (
    <div
      className={[
        "mb-2 rounded-xl border px-3 py-2 text-xs",
        isMine
          ? "border-primary-content/20 bg-primary-content/10 text-primary-content/85"
          : "border-base-content/10 bg-base-100/80 text-base-content/65",
      ].join(" ")}
    >
      <p className="font-semibold opacity-80">Edited message</p>

      {lastEdit?.previousText && (
        <p className="mt-1 line-clamp-2 opacity-70">
          Before: {lastEdit.previousText}
        </p>
      )}

      <p className="mt-1 opacity-60">
        {new Date(message.editedAt).toLocaleString()}
      </p>
    </div>
  );
}

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);

  const [messageText, setMessageText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);

  const [showGifSearch, setShowGifSearch] = useState(false);
  const [gifMode, setGifMode] = useState("gifs");
  const [gifQuery, setGifQuery] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingText, setEditingText] = useState("");

  const { authUser } = useAuthUser();
  const { socket, startCall } = useCall();

  const { data: targetUser } = useQuery({
    queryKey: ["user", targetUserId],
    queryFn: () => getUserProfile(targetUserId),
    enabled: !!targetUserId,
  });

  const {
    data: messages = [],
    isLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["messages", targetUserId],
    queryFn: () => getMessages(targetUserId),
    enabled: !!targetUserId,
    refetchInterval: 2000,
  });

  const { data: rawGifResults = [], isLoading: gifsLoading } = useQuery({
    queryKey: ["klipy", gifMode, gifQuery],
    queryFn: () => searchGifs(gifQuery, gifMode),
    enabled: showGifSearch && gifQuery.trim().length > 1,
    staleTime: 1000 * 60,
    retry: 1,
  });

  const gifResults = useMemo(() => {
    return (rawGifResults || [])
      .map((item) => normalizeKlipyItem(item, gifMode))
      .filter((item) => item.url || item.previewUrl);
  }, [rawGifResults, gifMode]);

  const { mutate: sendMessageMutation, isPending } = useMutation({
    mutationFn: (payload) => sendMessage(targetUserId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["messages", targetUserId] });
      const previousMessages = queryClient.getQueryData(["messages", targetUserId]) || [];
      const clientId = payload.clientId || makeClientId("message");
      const mediaKind = mediaFile?.type?.startsWith("audio/")
        ? "audio"
        : mediaFile?.type?.startsWith("video/")
          ? "video"
          : mediaFile?.type?.startsWith("image/")
            ? "image"
            : mediaPreview
              ? "file"
              : null;
      const optimisticMessage = {
        _id: clientId,
        clientId,
        sender: authUser?._id,
        recipient: targetUserId,
        senderUser: authUser,
        recipientUser: targetUser,
        text: payload.text || "",
        media:
          payload.mediaDataUrl && mediaKind && mediaKind !== "audio"
            ? { url: payload.mediaDataUrl, kind: mediaKind, filename: payload.mediaName }
            : null,
        voice:
          payload.mediaDataUrl && mediaKind === "audio"
            ? { url: payload.mediaDataUrl, kind: "audio", filename: payload.mediaName }
            : null,
        gif: payload.gif || null,
        replyTo: payload.replyTo || null,
        replyToMessage: replyTarget
          ? {
              _id: replyTarget._id,
              sender: getMessageSenderId(replyTarget),
              text: replyTarget.text || "",
              mediaKind: replyTarget.media?.kind || (replyTarget.voice ? "voice" : replyTarget.gif ? "gif" : null),
              sharedPostId: replyTarget.sharedPostId || null,
            }
          : null,
        readBy: [authUser?._id].filter(Boolean),
        reactions: [],
        status: "sending",
        optimistic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(["messages", targetUserId], [
        ...previousMessages,
        optimisticMessage,
      ]);

      return { previousMessages, clientId };
    },
    onSuccess: (message, _variables, context) => {
      setMessageText("");
      setMediaFile(null);
      setMediaPreview(null);
      setReplyTarget(null);
      setShowGifSearch(false);
      setGifQuery("");

      queryClient.setQueryData(["messages", targetUserId], (oldMessages = []) => {
        let replaced = false;
        const nextMessages = oldMessages.map((item) => {
          if (item.clientId && item.clientId === context?.clientId) {
            replaced = true;
            return message;
          }
          return item;
        });
        return replaced ? nextMessages : [...nextMessages, message];
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error, _variables, context) => {
      const message = getApiErrorMessage(error, "Could not send message");
      queryClient.setQueryData(["messages", targetUserId], (oldMessages = []) =>
        oldMessages.map((item) =>
          item.clientId && item.clientId === context?.clientId
            ? { ...item, status: "failed", failedReason: message }
            : item
        )
      );
      toast.error(message);
    },
  });

  const { mutate: reportMutation } = useMutation({
    mutationFn: createReport,
    onSuccess: () => toast.success("Report sent to moderation"),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not report")),
  });

  const { mutate: editMessageMutation, isPending: editingPending } = useMutation({
    mutationFn: ({ messageId, text }) =>
      editMessage(targetUserId, messageId, text),
    onSuccess: () => {
      setEditingMessage(null);
      setEditingText("");
      queryClient.invalidateQueries({ queryKey: ["messages", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not edit message")),
  });

  const { mutate: deleteMessageMutation } = useMutation({
    mutationFn: (messageId) => deleteMessage(targetUserId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not delete message")),
  });

  const { mutate: reactMessageMutation } = useMutation({
    mutationFn: ({ messageId, emoji }) =>
      toggleMessageReaction(targetUserId, messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not react to message")),
  });

  const { mutate: blockMutation, isPending: blocking } = useMutation({
    mutationFn: () =>
      targetUser?.isBlockedByMe
        ? unblockUser(targetUserId)
        : blockUser(targetUserId),
    onSuccess: () => {
      toast.success(targetUser?.isBlockedByMe ? "User unblocked" : "User blocked");
      queryClient.invalidateQueries({ queryKey: ["user", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["messages", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update block")),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPeerTyping]);

  useEffect(() => {
    if (!socket || !targetUserId) return;

    const handleTyping = ({ fromUserId, isTyping }) => {
      if (String(fromUserId) === String(targetUserId)) {
        setIsPeerTyping(Boolean(isTyping));
      }
    };

    socket.on("chat:typing", handleTyping);

    return () => {
      setIsPeerTyping(false);
      socket.off("chat:typing", handleTyping);
    };
  }, [socket, targetUserId]);

  useEffect(() => {
    return () => {
      window.clearTimeout(typingTimeoutRef.current);
      socket?.emit("chat:typing", { toUserId: targetUserId, isTyping: false });
    };
  }, [socket, targetUserId]);

  useEffect(() => {
    const stopTypingWhenHidden = () => {
      if (document.hidden) {
        window.clearTimeout(typingTimeoutRef.current);
        socket?.emit("chat:typing", { toUserId: targetUserId, isTyping: false });
      }
    };

    document.addEventListener("visibilitychange", stopTypingWhenHidden);
    window.addEventListener("blur", stopTypingWhenHidden);

    return () => {
      document.removeEventListener("visibilitychange", stopTypingWhenHidden);
      window.removeEventListener("blur", stopTypingWhenHidden);
    };
  }, [socket, targetUserId]);

  const emitTyping = (isTyping) => {
    if (!socket || !targetUserId || document.hidden) return;

    socket.emit("chat:typing", {
      toUserId: targetUserId,
      isTyping,
    });
  };

  const conversationBlocked = targetUser?.isBlockedByMe || targetUser?.hasBlockedMe;

  const handleSendMessage = (event) => {
    event.preventDefault();

    const text = messageText.trim();

    if (conversationBlocked) {
      toast.error("This conversation is blocked");
      return;
    }

    if ((!text && !mediaPreview) || isPending) return;

    emitTyping(false);

    sendMessageMutation({
      clientId: makeClientId("message"),
      text,
      mediaDataUrl: mediaPreview,
      mediaName: mediaFile?.name,
      replyTo: replyTarget?._id || null,
    });
  };

  const handleMediaChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setShowGifSearch(false);
    setMediaFile(file);
    setMediaPreview(await fileToDataUrl(file));
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: "audio/webm",
        });

        setMediaFile({ name: "voice-message.webm", type: "audio/webm" });
        setMediaPreview(await fileToDataUrl(blob));

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast("Recording voice message");
    } catch {
      toast.error("Microphone is not available");
    }
  };

  const handleCall = (mode) => {
    if (!targetUser) {
      toast.error("Friend profile is still loading");
      return;
    }

    startCall(targetUser, mode);
  };

  const handleReportMessage = async (messageId) => {
    const report = await promptReport("message", messageId);
    if (report) reportMutation(report);
  };

  const startInlineEdit = (message) => {
    setEditingMessage(message);
    setEditingText(message.text || "");
  };

  const saveInlineEdit = () => {
    const text = editingText.trim();

    if (!editingMessage?._id || !text || text === editingMessage.text) {
      setEditingMessage(null);
      setEditingText("");
      return;
    }

    editMessageMutation({
      messageId: editingMessage._id,
      text,
    });
  };

  const sendGif = (gif) => {
    if (conversationBlocked) {
      toast.error("This conversation is blocked");
      return;
    }

    const normalizedGif = normalizeKlipyItem(gif, gifMode);

    if (!normalizedGif.url) {
      toast.error("Could not send this KLIPY item");
      return;
    }

    emitTyping(false);

    sendMessageMutation({
      clientId: makeClientId("message"),
      text: "",
      gif: normalizedGif,
      replyTo: replyTarget?._id || null,
    });
  };

  if (isLoading || !authUser) return <ChatLoader />;

  const targetAvatar =
    targetUser?.profilePic ||
    makeLocalAvatar(targetUser?.fullName || targetUser?.username || "Friend");

  const authAvatar =
    authUser?.profilePic ||
    makeLocalAvatar(authUser?.fullName || authUser?.username || "You");

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-base-100">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-base-300 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/messages"
            className="grid size-9 place-items-center rounded-full text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
            aria-label="Back to messages"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>

          <Link
            to={`/profile/${targetUserId}`}
            className="size-10 shrink-0 overflow-hidden rounded-full bg-base-300"
          >
            <img
              src={targetAvatar}
              alt={targetUser?.fullName || "Friend"}
              className="h-full w-full object-cover"
            />
          </Link>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-semibold">
                {targetUser?.fullName || "Conversation"}
              </h1>
              <UserBadges badges={targetUser?.badges} compact />
            </div>

            <p className="truncate text-xs text-base-content/50">
              {targetUser?.inCall
                ? "In a call"
                : targetUser?.isOnline
                  ? "Online"
                  : targetUser?.learningLanguage
                    ? `Learning ${targetUser.learningLanguage}`
                    : "Local chat"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className={[
              "hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition sm:inline-flex",
              targetUser?.isBlockedByMe
                ? "bg-error text-white hover:bg-error/90"
                : "text-base-content/60 hover:bg-base-200 hover:text-base-content",
            ].join(" ")}
            onClick={() => blockMutation()}
            disabled={blocking}
          >
            <BanIcon className="size-4" />
            {targetUser?.isBlockedByMe ? "Unblock" : "Block"}
          </button>

          <CallButton
            onAudioCall={() => handleCall("audio")}
            onVideoCall={() => handleCall("video")}
          />
        </div>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-3 py-5 sm:px-6">
        {conversationBlocked && (
          <div className="rounded-2xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
            <div className="flex gap-2">
              <BanIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                {targetUser?.isBlockedByMe
                  ? "You blocked this user. Unblock to send messages."
                  : "This user blocked this conversation."}
              </span>
            </div>
          </div>
        )}

        {messagesError ? (
          <div className="rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error">
            {getApiErrorMessage(messagesError, "Could not load this conversation")}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-base-200">
                <SmilePlusIcon className="size-6 text-base-content/35" />
              </div>
              <p className="font-semibold">No messages yet</p>
              <p className="mt-1 text-sm text-base-content/50">
                Send a message, GIF, sticker, photo, or voice note.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = isMessageMine(message, authUser);
            const isDeleted = Boolean(message.deletedAt);
            const isEditing = editingMessage?._id === message._id;
            const profileId = isMine ? authUser._id : targetUserId;
            const avatarSrc = isMine ? authAvatar : targetAvatar;

            return (
              <div
                key={message._id}
                className={[
                  "group flex gap-2",
                  isMine ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {!isMine && (
                  <Link
                    to={`/profile/${profileId}`}
                    className="mt-6 size-8 shrink-0 overflow-hidden rounded-full bg-base-300"
                  >
                    <img
                      src={avatarSrc}
                      alt={targetUser?.fullName || "Friend"}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                )}

                <div
                  className={[
                    "flex max-w-[82vw] flex-col",
                    isMine ? "items-end" : "items-start",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[0.68rem] text-base-content/45">
                    <span>{isMine ? "You" : targetUser?.fullName || "Friend"}</span>
                    <time>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>

                    {!isDeleted && (
                      <div className="ml-1 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                        {isMine && message.text && (
                          <button
                            type="button"
                            className="grid size-6 place-items-center rounded-full hover:bg-base-200"
                            onClick={() => startInlineEdit(message)}
                            aria-label="Edit message"
                          >
                            <PencilIcon className="size-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          className="grid size-6 place-items-center rounded-full hover:bg-base-200"
                          onClick={() => setReplyTarget(message)}
                          aria-label="Reply to message"
                        >
                          <ReplyIcon className="size-3" />
                        </button>

                        <div className="flex items-center gap-0.5 rounded-full bg-base-100/80 px-1">
                          {MESSAGE_REACTIONS.slice(0, 4).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="grid size-6 place-items-center rounded-full text-[0.78rem] hover:bg-base-200"
                              onClick={() =>
                                reactMessageMutation({
                                  messageId: message._id,
                                  emoji,
                                })
                              }
                              aria-label={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {isMine && (
                          <button
                            type="button"
                            className="grid size-6 place-items-center rounded-full hover:bg-base-200 hover:text-error"
                            onClick={() => deleteMessageMutation(message._id)}
                            aria-label="Delete message"
                          >
                            <Trash2Icon className="size-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          className="grid size-6 place-items-center rounded-full hover:bg-base-200 hover:text-warning"
                          onClick={() => handleReportMessage(message._id)}
                          aria-label="Report message"
                        >
                          <FlagIcon className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className={[
                      "rounded-[1.2rem] px-3 py-2 text-sm shadow-sm",
                      isMine
                        ? "rounded-br-md bg-primary text-primary-content"
                        : "rounded-bl-md bg-base-200 text-base-content",
                    ].join(" ")}
                  >
                    {!isDeleted && message.replyToMessage && (
                      <div className="mb-2 rounded-xl border border-base-content/15 bg-base-100/20 px-3 py-2 text-xs">
                        <p className="font-semibold opacity-80">
                          Replying to{" "}
                          {isMessageMine(message.replyToMessage, authUser)
                            ? "you"
                            : targetUser?.fullName || "message"}
                        </p>
                        <p className="line-clamp-2 opacity-75">
                          {message.replyToMessage.text ||
                            (message.replyToMessage.sharedPostId ? "Shared post" : "") ||
                            message.replyToMessage.mediaKind ||
                            message.replyToMessage.gif?.title ||
                            "Attachment"}
                        </p>
                      </div>
                    )}

                    {isDeleted ? (
                      <p className="italic opacity-70">Message deleted</p>
                    ) : isEditing ? (
                      <div className="w-[min(20rem,75vw)] space-y-2">
                        <textarea
                          className="textarea textarea-bordered min-h-20 w-full resize-none rounded-2xl bg-base-100 text-base-content"
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                          autoFocus
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs rounded-full"
                            onClick={() => {
                              setEditingMessage(null);
                              setEditingText("");
                            }}
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary btn-xs rounded-full"
                            onClick={saveInlineEdit}
                            disabled={editingPending}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <InlineEditHistory message={message} isMine={isMine} />

                        {message.text && (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        )}

                        {message.sharedPost && (
                          <MessageSharedPostPreview
                            post={message.sharedPost}
                            isMine={isMine}
                          />
                        )}

                        {message.editedAt && (
                          <p className="mt-1 text-[0.65rem] opacity-60">edited</p>
                        )}

                        {message.voice?.url && (
                          <audio src={message.voice.url} controls className="mt-2 max-w-xs" />
                        )}

                        {message.gif?.url && <MessageGif gif={message.gif} />}

                        {message.media?.kind === "video" && (
                          <video
                            src={message.media.url}
                            controls
                            className="mt-2 max-w-xs rounded-2xl bg-black"
                          />
                        )}

                        {message.media?.kind === "image" && (
                          <img
                            src={message.media.url}
                            alt="Message media"
                            className="mt-2 max-w-xs rounded-2xl"
                          />
                        )}

                        {message.media?.kind === "file" && (
                          <a
                            href={message.media.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 flex max-w-xs items-center gap-2 rounded-xl border border-base-content/20 px-3 py-2 text-sm underline"
                          >
                            <FileIcon className="size-4" />
                            {message.media.filename || "Open file"}
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {!isDeleted && message.reactions?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {message.reactions.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          type="button"
                          className={[
                            "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition",
                            reaction.isMine
                              ? "border-primary/35 bg-primary/10 text-primary"
                              : "border-base-300 bg-base-100 text-base-content/60 hover:bg-base-200",
                          ].join(" ")}
                          onClick={() =>
                            reactMessageMutation({
                              messageId: message._id,
                              emoji: reaction.emoji,
                            })
                          }
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}

                      <div className="flex gap-0.5 sm:hidden">
                        {MESSAGE_REACTIONS.slice(0, 4).map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="grid size-6 place-items-center rounded-full border border-base-300 bg-base-100 text-[0.72rem]"
                            onClick={() =>
                              reactMessageMutation({
                                messageId: message._id,
                                emoji,
                              })
                            }
                            aria-label={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isMine && !isDeleted && (
                    <div className="mt-1 flex items-center gap-1 text-[0.68rem] text-base-content/45">
                      <CheckCheckIcon className="size-3" />
                      {message.status === "failed"
                        ? message.failedReason || "Failed"
                        : message.status === "sending"
                          ? "Sending..."
                          : message.readBy?.includes(targetUserId)
                            ? "Seen"
                            : "Sent"}
                    </div>
                  )}
                </div>

                {isMine && (
                  <Link
                    to={`/profile/${profileId}`}
                    className="mt-6 size-8 shrink-0 overflow-hidden rounded-full bg-base-300"
                  >
                    <img
                      src={avatarSrc}
                      alt={authUser.fullName || "You"}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                )}
              </div>
            );
          })
        )}

        {isPeerTyping && (
          <div className="flex items-center gap-2 pl-10 text-xs text-base-content/45">
            <div className="flex gap-1 rounded-full bg-base-200 px-3 py-2">
              <span className="size-1.5 animate-bounce rounded-full bg-base-content/40" />
              <span className="size-1.5 animate-bounce rounded-full bg-base-content/40 [animation-delay:120ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-base-content/40 [animation-delay:240ms]" />
            </div>
            <span>{targetUser?.fullName || "Friend"} is typing</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <form
        onSubmit={handleSendMessage}
        className="relative space-y-3 border-t border-base-300 bg-base-100/95 p-3 backdrop-blur-xl sm:p-4"
      >
        {replyTarget && (
          <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200/70 px-3 py-2">
            <ReplyIcon className="size-4 text-base-content/55" />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">
                Replying to{" "}
                {isMessageMine(replyTarget, authUser)
                  ? "your message"
                  : targetUser?.fullName || "message"}
              </p>
              <p className="truncate text-xs text-base-content/55">
                {replyTarget.text ||
                  (replyTarget.sharedPostId ? "Shared post" : "") ||
                  replyTarget.media?.kind ||
                  replyTarget.voice?.kind ||
                  replyTarget.gif?.title ||
                  "Attachment"}
              </p>
            </div>

            <button
              type="button"
              className="grid size-7 place-items-center rounded-full text-base-content/45 hover:bg-base-300 hover:text-base-content"
              onClick={() => setReplyTarget(null)}
              aria-label="Cancel reply"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )}

        {mediaPreview && (
          <div className="relative w-fit max-w-full overflow-hidden rounded-2xl border border-base-300 bg-base-100">
            {mediaFile?.type?.startsWith("audio/") ? (
              <audio src={mediaPreview} controls className="bg-base-100 p-3" />
            ) : mediaFile?.type?.startsWith("video/") ? (
              <video src={mediaPreview} controls className="max-h-40 bg-black" />
            ) : mediaFile?.type?.startsWith("image/") ? (
              <img src={mediaPreview} alt="Attachment preview" className="max-h-40 object-cover" />
            ) : (
              <div className="flex items-center gap-2 bg-base-100 px-4 py-3 text-sm">
                <FileIcon className="size-4" />
                {mediaFile?.name || "File attachment"}
              </div>
            )}

            <button
              type="button"
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white"
              onClick={() => {
                setMediaFile(null);
                setMediaPreview(null);
              }}
              aria-label="Remove attachment"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )}

        <KlipyPicker
          open={showGifSearch}
          mode={gifMode}
          setMode={setGifMode}
          query={gifQuery}
          setQuery={setGifQuery}
          results={gifResults}
          isLoading={gifsLoading}
          onClose={() => setShowGifSearch(false)}
          onSelect={sendGif}
        />

        <div className="flex items-end gap-2">
          <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-base-content/55 transition hover:bg-base-200 hover:text-base-content">
            <ImageIcon className="size-5" />
            <input
              type="file"
              accept="image/*,video/*,audio/*,.txt,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleMediaChange}
            />
          </label>

          <button
            type="button"
            className={[
              "grid size-11 shrink-0 place-items-center rounded-full transition",
              isRecording
                ? "bg-error text-white"
                : "text-base-content/55 hover:bg-base-200 hover:text-base-content",
            ].join(" ")}
            onClick={handleVoiceRecording}
          >
            <MicIcon className="size-5" />
          </button>

          <button
            type="button"
            className={[
              "grid size-11 shrink-0 place-items-center rounded-full transition",
              showGifSearch
                ? "bg-primary text-primary-content"
                : "text-base-content/55 hover:bg-base-200 hover:text-base-content",
            ].join(" ")}
            onClick={() => {
              setShowGifSearch((value) => !value);
              setMediaFile(null);
              setMediaPreview(null);
            }}
          >
            <SmilePlusIcon className="size-5" />
          </button>

          <textarea
            className="textarea textarea-bordered min-h-11 max-h-32 flex-1 resize-none rounded-2xl bg-base-100"
            placeholder="Type a message"
            value={messageText}
            onChange={(event) => {
              setMessageText(event.target.value);
              emitTyping(true);

              window.clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = window.setTimeout(() => emitTyping(false), 1200);
            }}
            onBlur={() => emitTyping(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                handleSendMessage(event);
              }
            }}
          />

          <button
            type="submit"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-content transition hover:bg-primary/90 disabled:opacity-50"
            disabled={
              (!messageText.trim() && !mediaPreview) ||
              isPending ||
              conversationBlocked
            }
          >
            {isPending ? (
              <LoaderIcon className="size-5 animate-spin" />
            ) : (
              <SendIcon className="size-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;
