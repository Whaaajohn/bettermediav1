import { createElement, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIcon,
  BotIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  LoaderIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { deleteMyBotMemory, getBotModels, getBotProfile, getMyBotMemory, messageBot } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { makeLocalAvatar } from "../lib/utils";

export default function BotPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["botProfile"],
    queryFn: getBotProfile,
  });

  const { data: memoryData } = useQuery({
    queryKey: ["botMemory"],
    queryFn: getMyBotMemory,
  });

  const { data: modelData } = useQuery({
    queryKey: ["botModels"],
    queryFn: getBotModels,
    staleTime: 1000 * 60,
  });

  const bot = data?.profile;
  const health = data?.health;
  const training = data?.training || {};
  const settings = data?.settings || {};

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: messageBot,
    onSuccess: (result) => {
      setText("");
      toast.success("Message sent to MEDIA ModBot");
      queryClient.invalidateQueries({ queryKey: ["messages", bot?._id] });
      if (result?.bot?._id) {
        queryClient.invalidateQueries({ queryKey: ["messages", result.bot._id] });
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not message ModBot")),
  });

  const { mutate: clearMemory, isPending: clearingMemory } = useMutation({
    mutationFn: deleteMyBotMemory,
    onSuccess: () => {
      toast.success("ModBot memory cleared");
      queryClient.invalidateQueries({ queryKey: ["botMemory"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not clear ModBot memory")),
  });

  const avatar = bot?.profilePic || makeLocalAvatar(bot?.fullName || "MEDIA ModBot");

  if (isLoading) {
    return (
      <div className="grid min-h-full place-items-center bg-base-100">
        <LoaderIcon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="overflow-hidden rounded-[1.5rem] border border-cyan-400/15 bg-base-100 shadow-[0_24px_80px_rgba(6,182,212,0.08)]">
          <div className="border-b border-cyan-400/10 bg-gradient-to-br from-slate-950 via-base-100 to-cyan-950/30 px-5 py-5">
            <div className="flex items-center gap-4">
              <Link to={bot?._id ? `/profile/${bot._id}` : "#"} className="avatar">
                <div className="size-16 overflow-hidden rounded-full bg-base-300">
                  <img src={avatar} alt={bot?.fullName || "MEDIA ModBot"} className="h-full w-full object-cover" />
                </div>
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold">{bot?.fullName || "MEDIA ModBot"}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <ShieldCheckIcon className="size-3.5" />
                    Mod
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                    <BrainCircuitIcon className="size-3.5" />
                    Local AI
                  </span>
                </div>
                <p className="mt-1 text-sm text-base-content/60">
                  @{bot?.username || "modbot"} • Local safety, language, and social assistant
                </p>
              </div>

              {bot?._id && (
                <Link to={`/chat/${bot._id}`} className="btn btn-primary rounded-xl">
                  <MessageCircleIcon className="size-4" />
                  Open chat
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <h2 className="font-semibold">Ask ModBot</h2>
              <textarea
                className="textarea textarea-bordered min-h-32 w-full rounded-2xl bg-base-100"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ask about rules, reports, appeals, account safety, language practice, or app help."
              />
              <button
                className="btn btn-primary rounded-xl"
                disabled={isPending || !text.trim()}
                onClick={() => sendMessage({ text })}
              >
                {isPending ? <LoaderIcon className="size-4 animate-spin" /> : <BotIcon className="size-4" />}
                Send
              </button>
            </div>

            <div className="space-y-3 rounded-[1.25rem] border border-cyan-400/15 bg-base-200/35 p-4">
              <h2 className="font-semibold">Live status</h2>
              <div className="grid gap-2 text-sm text-base-content/70">
                {[
                  ["Engine", health?.enabled ? "Online" : "Offline", ActivityIcon],
                  ["Brain", health?.ollama?.enabled ? `Ollama ${health.ollama.model}` : "Local rules", BrainCircuitIcon],
                  ["Reply brain", settings.allowModelReply ? health?.replyModel || "Local model" : "Rule replies", BrainCircuitIcon],
                  ["Critical action", health?.moderationPowers?.criticalConfidenceAction || "review", ShieldCheckIcon],
                  ["Follow back", settings.autoFollowBack ? "On" : "Off", UserPlusIcon],
                  ["Auto actions", health?.moderationPowers?.autoActions ? "Limited" : "Review only", ShieldCheckIcon],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-base-100/70 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-base-content/55">
                      {createElement(Icon, { className: "size-4 text-cyan-300" })}
                      {label}
                    </span>
                    <span className="font-semibold text-base-content">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="size-4 text-cyan-300" />
                  <h2 className="font-semibold">Your ModBot memory</h2>
                </div>
                <p className="mt-1 text-sm text-base-content/55">
                  Safe casual notes used to keep replies personal. Moderation records are separate.
                </p>
              </div>

              <button
                className="btn btn-ghost btn-xs rounded-lg text-error"
                disabled={clearingMemory}
                onClick={() => clearMemory()}
              >
                {clearingMemory ? (
                  <LoaderIcon className="size-3 animate-spin" />
                ) : (
                  <Trash2Icon className="size-3" />
                )}
                Clear
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-base-200/50 p-3 text-sm text-base-content/65">
              {memoryData?.memory?.summary ? (
                <p>{memoryData.memory.summary}</p>
              ) : Object.keys(memoryData?.memory?.casual || {}).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(memoryData.memory.casual).map(([key, value]) => (
                    <p key={key}>
                      <span className="font-semibold text-base-content">{key}:</span>{" "}
                      {String(value)}
                    </p>
                  ))}
                </div>
              ) : (
                <p>No personal memory saved yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <BrainCircuitIcon className="size-4 text-cyan-300" />
              <h2 className="font-semibold">Local model stack</h2>
            </div>
            <p className="mt-1 text-sm text-base-content/55">
              ModBot uses models running on this PC when Ollama is available.
            </p>

            <div className="mt-3 grid gap-2 text-sm">
              {(modelData?.models || modelData || []).slice?.(0, 5)?.map?.((model) => (
                <div key={model.name || model.model || model} className="rounded-2xl bg-base-200/50 px-3 py-2">
                  <p className="font-semibold">
                    {model.name || model.model || model}
                  </p>
                  {model.modified_at && (
                    <p className="text-xs text-base-content/45">
                      Updated {new Date(model.modified_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )) || (
                <div className="rounded-2xl bg-base-200/50 px-3 py-2 text-sm text-base-content/55">
                  Model list unavailable. Rules still work locally.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            ["Rules", training.rules],
            ["Tone", training.moderationTone],
            ["Language practice", training.languagePractice],
            ["Escalation", training.escalation],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-base-content/65">{body || "Configured by admins."}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 text-sm text-base-content/65 shadow-sm">
          <h2 className="font-semibold text-base-content">Safety boundaries</h2>
          <p className="mt-2 leading-6">
            ModBot can chat, reply to mentions, thank followers, create reports, warn users, mute messaging, restrict
            app features, and apply temporary bans when admins enable those powers. It cannot full-ban users, delete
            users, remove admins, clear audit logs, or change server settings.
          </p>
        </section>
      </div>
    </div>
  );
}
