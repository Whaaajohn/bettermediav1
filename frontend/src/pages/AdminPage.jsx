import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  BellIcon,
  BotIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileTextIcon,
  FlagIcon,
  LoaderIcon,
  MailIcon,
  MessageSquareWarningIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserCogIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import PostComposer from "../components/PostComposer";
import UserBadges from "../components/UserBadges";
import useAuthUser from "../hooks/useAuthUser";
import {
  applyModerationAction,
  approveBotAction,
  createPost,
  deletePost,
  getAdminPanel,
  rejectBotAction,
  rescanBotTarget,
  reviewAppealWithBot,
  runMigrationDryRun,
  resolveAppeal,
  resolveReport,
  sendSmtpTest,
  sendStaffNotification,
  testAdminService,
  undoBotAction,
  updateAdminSettings,
  updateBotSettings,
  updateBotTraining,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { makeLocalAvatar } from "../lib/utils";

const actionLabels = {
  warn: "Send warning",
  messageBan: "Ban from texting",
  clearMessageBan: "Clear texting ban",
  shadowBan: "Shadow ban feed",
  clearShadowBan: "Clear shadow ban",
  ban: "Timed account ban",
  clearBan: "Clear timed ban",
  fullBan: "Full account ban",
  clearFullBan: "Clear full ban",
  makeMod: "Make mod",
  removeMod: "Remove mod",
  makeAdmin: "Make admin",
  removeAdmin: "Remove admin",
  verifyEmail: "Mark email verified",
  unverifyEmail: "Mark email unverified",
  grantVerified: "Grant check badge",
  removeVerified: "Remove check badge",
  grantFeatured: "Grant featured badge",
  removeFeatured: "Remove featured badge",
  grantLanguagePro: "Grant language pro badge",
  removeLanguagePro: "Remove language pro badge",
  clearModerationRecords: "Clear moderation record",
  clearReportHistory: "Clear report history",
  clearAppealHistory: "Clear appeal history",
  deleteUserPosts: "Delete user posts",
  deleteUserReposts: "Delete user reposts",
  resetProfilePhoto: "Reset profile photo",
};

const destructiveActions = new Set([
  "messageBan",
  "shadowBan",
  "ban",
  "fullBan",
  "deleteUserPosts",
  "deleteUserReposts",
  "clearModerationRecords",
  "clearReportHistory",
  "clearAppealHistory",
  "resetProfilePhoto",
]);

const timedActions = new Set(["ban", "messageBan", "shadowBan"]);

const tabs = [
  ["dashboard", "Dashboard", DatabaseIcon],
  ["users", "Users", UserCogIcon],
  ["reports", "Reports", FlagIcon],
  ["appeals", "Appeals", BellIcon],
  ["content", "Content", FileTextIcon],
  ["bot", "Bot", BotIcon],
  ["mail", "Mail", MailIcon],
  ["audit", "Audit", ShieldCheckIcon],
  ["diagnostics", "Diagnostics", DatabaseIcon],
  ["settings", "Settings", SettingsIcon],
  ["create", "Create", SendIcon],
];

const botFields = [
  ["rules", "Community rules"],
  ["moderationTone", "Moderation tone"],
  ["languagePractice", "Language practice style"],
  ["escalation", "Escalation wording"],
  ["blockedTopics", "Blocked topics"],
];

const botSettingToggles = [
  ["enabled", "Engine on"],
  ["scanPosts", "Scan posts"],
  ["scanComments", "Scan comments"],
  ["scanMessages", "Scan messages"],
  ["scanReports", "Scan reports"],
  ["scanAppeals", "Scan appeals"],
  ["localAIEnabled", "Use local AI"],
  ["createReports", "Create reports"],
  ["warnUsers", "Warn users"],
  ["allowAutoActions", "Allow auto actions"],
  ["allowModelReply", "Use chat model replies"],
  ["autoFollowBack", "Follow back bot followers"],
  ["thankFollowEnabled", "Thank new bot followers"],
  ["randomCommentEnabled", "Social comments"],
  ["autoHideHighConfidence", "Auto-hide high confidence"],
  ["autoMuteCritical", "Auto-mute high/critical"],
  ["autoTempBanCritical", "Auto temp-ban critical"],
];

const botActionOptions = ["log", "warn", "report", "escalate", "hide_content", "temp_mute", "restrict", "temp_ban"];

const userFilters = [
  ["all", "All users"],
  ["banned", "Any ban"],
  ["fullBanned", "Full banned"],
  ["mods", "Mods"],
  ["admins", "Admins"],
  ["unverified", "Email needed"],
  ["verifiedBadge", "Has check"],
  ["online", "Online"],
];

function safeLower(value) {
  return String(value || "").toLowerCase();
}

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTextValue(payload) {
  return String(
    payload?.text ||
      payload?.content ||
      payload?.body ||
      payload?.caption ||
      payload?.message ||
      ""
  ).trim();
}

function hasRealMedia(payload) {
  const mediaFields = [
    payload?.image,
    payload?.imageUrl,
    payload?.media,
    payload?.mediaUrl,
    payload?.attachment,
    payload?.attachments,
    payload?.photos,
    payload?.video,
    payload?.videoUrl,
  ];

  return mediaFields.some((value) => {
    if (!value) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  });
}

function hasBannerOnly(payload) {
  const hasBanner =
    Boolean(payload?.banner) ||
    Boolean(payload?.bannerUrl) ||
    Boolean(payload?.bannerImage) ||
    Boolean(payload?.cover) ||
    Boolean(payload?.coverImage);

  if (!hasBanner) return false;

  return getTextValue(payload).length === 0 && !hasRealMedia(payload);
}

function isValidPostPayload(payload) {
  return getTextValue(payload).length > 0 || hasRealMedia(payload);
}

function PageShell({ children }) {
  return (
    <div className="min-h-full bg-base-100 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">{children}</div>
    </div>
  );
}

function SoftCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-[1.4rem] border border-base-300 bg-base-100 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon = FileTextIcon, title, description }) {
  return (
    <div className="rounded-[1.4rem] border border-base-300 bg-base-100 p-8 text-center">
      {createElement(Icon, { className: "mx-auto size-8 text-base-content/35" })}
      <p className="mt-3 font-semibold">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-base-content/50">{description}</p>
      )}
    </div>
  );
}

function InlineError({ error, fallback = "Something went wrong" }) {
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

function StatusPill({ children, tone = "neutral" }) {
  const styles = {
    neutral: "border-base-300 bg-base-200/70 text-base-content/65",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-warning/25 bg-warning/10 text-warning",
    error: "border-error/25 bg-error/10 text-error",
    primary: "border-primary/25 bg-primary/10 text-primary",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[tone] || styles.neutral
      }`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[1.3rem] border border-base-300 bg-base-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-base-content/45">{label}</p>
        {createElement(Icon, { className: "size-4 text-base-content/35" })}
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function UserIdentity({ user }) {
  const avatar =
    user?.profilePic ||
    makeLocalAvatar(user?.fullName || user?.username || "User");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="size-10 shrink-0 overflow-hidden rounded-full bg-base-300">
        <img
          src={avatar}
          alt={user?.fullName || "User"}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-semibold">
            {user?.fullName || "Unknown user"}
          </p>
          <UserBadges badges={user?.badges || []} compact />
        </div>

        <p className="truncate text-xs text-base-content/50">
          @{user?.username || "unknown"} · {user?.email || "no email"}
        </p>
      </div>
    </div>
  );
}

function TabBar({ activeTab, setActiveTab }) {
  return (
    <div className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-base-100/85 px-1 py-2 backdrop-blur-xl">
      <div className="flex w-max gap-1 rounded-2xl border border-base-300 bg-base-200/70 p-1">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
              activeTab === value
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/55 hover:bg-base-100/50 hover:text-base-content"
            }`}
          >
            {createElement(Icon, { className: "size-4" })}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="input input-bordered flex items-center gap-2 rounded-2xl bg-base-100">
      <SearchIcon className="size-4 text-base-content/40" />
      <input
        className="grow"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function ModerationModal({
  mode,
  user,
  adminSettings,
  onClose,
  onApply,
  onNotify,
  isBusy,
}) {
  const [form, setForm] = useState({
    type: "messageBan",
    days: adminSettings?.defaultBanDays || 7,
    reason: adminSettings?.defaultModerationReason || "",
    title: adminSettings?.defaultStaffTitle || "Message from moderation",
    message: "",
    email: adminSettings?.requireEmailForStaffOutreach ?? true,
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      type: "messageBan",
      days: adminSettings?.defaultBanDays || 7,
      reason: adminSettings?.defaultModerationReason || "",
      title: adminSettings?.defaultStaffTitle || "Message from moderation",
      message: "",
      email: adminSettings?.requireEmailForStaffOutreach ?? true,
    });
  }, [adminSettings, user]);

  if (!user) return null;

  const selectedActionLabel = actionLabels[form.type] || form.type;
  const isTimedAction = timedActions.has(form.type);
  const isDestructive = destructiveActions.has(form.type);
  const cleanReason = form.reason.trim() || selectedActionLabel;
  const cleanMessage = form.message.trim();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl overflow-hidden rounded-[1.6rem] border border-base-300 bg-base-100 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-base-300 px-5 py-4">
          <div>
            <p className="text-xs text-base-content/45">
              {mode === "notify" ? "Staff outreach" : "Moderation action"}
            </p>
            <h2 className="font-semibold">
              {mode === "notify" ? "Message user" : "Moderate user"}
            </h2>
          </div>

          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-base-content/55 hover:bg-base-200 hover:text-base-content"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <UserIdentity user={user} />

          {mode === "notify" ? (
            <div className="space-y-3">
              <label className="form-control">
                <span className="label-text mb-1">Title</span>
                <input
                  className="input input-bordered rounded-xl"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Message title"
                  disabled={isBusy}
                  maxLength={90}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Message</span>
                <textarea
                  className="textarea textarea-bordered min-h-32 rounded-xl"
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Write a clear staff message"
                  disabled={isBusy}
                  maxLength={1200}
                />
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.checked,
                    }))
                  }
                  disabled={isBusy}
                />
                <span>Also send email if SMTP is configured</span>
              </label>

              <button
                className="btn btn-primary w-full rounded-xl"
                disabled={isBusy || !cleanMessage}
                onClick={() =>
                  onNotify(user._id, {
                    title: form.title.trim() || "Message from moderation",
                    message: adminSettings?.staffSignature
                      ? `${cleanMessage}\n\n${adminSettings.staffSignature}`
                      : cleanMessage,
                    email: form.email,
                  })
                }
              >
                {isBusy ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                Send message
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="form-control">
                <span className="label-text mb-1">Action</span>
                <select
                  className="select select-bordered rounded-xl"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  disabled={isBusy}
                >
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {isTimedAction && (
                <label className="form-control">
                  <span className="label-text mb-1">Days</span>
                  <input
                    className="input input-bordered rounded-xl"
                    type="number"
                    min="1"
                    max="365"
                    value={form.days}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        days: event.target.value,
                      }))
                    }
                    disabled={isBusy}
                  />
                </label>
              )}

              <label className="form-control">
                <span className="label-text mb-1">Reason</span>
                <textarea
                  className="textarea textarea-bordered min-h-28 rounded-xl"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Reason shown in the app"
                  disabled={isBusy}
                  maxLength={500}
                />
              </label>

              {isDestructive && (
                <div className="rounded-2xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
                  This action can affect user access or content. Double-check
                  before applying.
                </div>
              )}

              <button
                className={`btn w-full rounded-xl ${
                  isDestructive ? "btn-error text-white" : "btn-primary"
                }`}
                disabled={isBusy}
                onClick={() =>
                  onApply(user._id, {
                    type: form.type,
                    days: isTimedAction
                      ? Math.min(365, Math.max(1, Number(form.days) || 1))
                      : undefined,
                    reason: cleanReason,
                  })
                }
              >
                {isBusy ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <ShieldCheckIcon className="size-4" />
                )}
                Apply action
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { authUser, isLoading: authLoading } = useAuthUser();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [modal, setModal] = useState({ mode: null, user: null });
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [botForm, setBotForm] = useState({});
  const [botSettingsForm, setBotSettingsForm] = useState({});
  const [settingsForm, setSettingsForm] = useState({});
  const [mailUserId, setMailUserId] = useState("");
  const [mailForm, setMailForm] = useState({
    title: "Message from moderation",
    message: "",
    email: true,
  });
  const [botDirty, setBotDirty] = useState(false);
  const [botSettingsDirty, setBotSettingsDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [mailDirty, setMailDirty] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  const {
    data: panel,
    isLoading,
    isFetching,
    error: panelError,
    refetch,
  } = useQuery({
    queryKey: ["adminPanel"],
    queryFn: getAdminPanel,
    enabled: Boolean(authUser?.isAdmin),
    refetchInterval: activeTab === "dashboard" ? 15000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  useEffect(() => {
    if (panel?.botTraining && !botDirty) {
      setBotForm(panel.botTraining);
    }
  }, [panel?.botTraining, botDirty]);

  useEffect(() => {
    if (panel?.botSettings && !botSettingsDirty) {
      setBotSettingsForm(panel.botSettings);
    }
  }, [panel?.botSettings, botSettingsDirty]);

  useEffect(() => {
    if (panel?.adminSettings && !settingsDirty) {
      setSettingsForm({
        ...panel.adminSettings,
        reportCategoriesText: (panel.adminSettings.reportCategories || []).join(
          "\n"
        ),
      });
    }
  }, [panel?.adminSettings, settingsDirty]);

  useEffect(() => {
    if (panel?.adminSettings && !mailDirty) {
      setMailForm((current) => ({
        ...current,
        title: panel.adminSettings.defaultStaffTitle || current.title,
        email: panel.adminSettings.requireEmailForStaffOutreach ?? current.email,
      }));
    }
  }, [panel?.adminSettings, mailDirty]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["adminPanel"] });
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const { mutate: applyAction, isPending: actionPending } = useMutation({
    mutationFn: ({ userId, action }) => applyModerationAction(userId, action),
    onSuccess: () => {
      toast.success("Moderation action saved");
      setModal({ mode: null, user: null });
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save action")),
  });

  const { mutate: notifyUser, isPending: notifyPending } = useMutation({
    mutationFn: ({ userId, payload }) => sendStaffNotification(userId, payload),
    onSuccess: (data) => {
      toast.success(
        data?.mail?.sent ? "In-app and email message sent" : "In-app message sent"
      );
      setModal({ mode: null, user: null });
      setMailDirty(false);
      setMailForm({ title: "Message from moderation", message: "", email: true });
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not send message")),
  });

  const { mutate: updateReport, isPending: reportPending } = useMutation({
    mutationFn: ({ id, payload }) => resolveReport(id, payload),
    onSuccess: () => {
      toast.success("Report updated");
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update report")),
  });

  const { mutate: updateAppeal, isPending: appealPending } = useMutation({
    mutationFn: ({ id, payload }) => resolveAppeal(id, payload),
    onSuccess: (data) => {
      toast.success(data?.mail?.sent ? "Appeal updated and emailed" : "Appeal updated");
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update appeal")),
  });

  const { mutateAsync: createAdminPost, isPending: posting } = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      toast.success("Admin post published");
      refresh();

      if (authUser?._id) {
        queryClient.invalidateQueries({
          queryKey: ["profilePosts", authUser._id],
        });
      }
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not publish admin post")),
  });

  const { mutate: removePost, isPending: deletingPost } = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      toast.success("Post deleted");
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not delete post")),
  });

  const { mutate: saveBotTraining, isPending: savingBot } = useMutation({
    mutationFn: updateBotTraining,
    onSuccess: () => {
      toast.success("ModBot training saved");
      setBotDirty(false);
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save bot training")),
  });

  const { mutate: saveBotSettings, isPending: savingBotSettings } = useMutation({
    mutationFn: updateBotSettings,
    onSuccess: () => {
      toast.success("ModBot settings saved");
      setBotSettingsDirty(false);
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save bot settings")),
  });

  const { mutate: reviewBotAction, isPending: reviewingBotAction } = useMutation({
    mutationFn: ({ id, action, payload }) => {
      if (action === "approve") return approveBotAction(id, payload);
      if (action === "reject") return rejectBotAction(id, payload);
      return undoBotAction(id, payload);
    },
    onSuccess: () => {
      toast.success("Bot action updated");
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update bot action")),
  });

  const { mutate: requestBotAppealReview, isPending: botAppealReviewing } = useMutation({
    mutationFn: reviewAppealWithBot,
    onSuccess: (data) => {
      const decision = data?.review?.decision?.replace(/_/g, " ") || "review saved";
      toast.success(`ModBot appeal review: ${decision}`);
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not review appeal with ModBot")),
  });

  const { mutate: rescanTarget, isPending: rescanningTarget } = useMutation({
    mutationFn: ({ targetType, targetId }) => rescanBotTarget(targetType, targetId),
    onSuccess: (data) => {
      const action = data?.action?.actionType?.replace(/_/g, " ") || data?.decision?.recommendedAction || "scan complete";
      toast.success(`ModBot rescan: ${action}`);
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not rescan target")),
  });

  const { mutate: saveAdminSettings, isPending: savingSettings } = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: () => {
      toast.success("Admin settings saved");
      setSettingsDirty(false);
      refresh();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save admin settings")),
  });

  const { mutate: testSmtp, isPending: testingSmtp } = useMutation({
    mutationFn: sendSmtpTest,
    onSuccess: (data) => {
      if (data?.success) toast.success("SMTP test email sent");
      else toast.error(data?.message || data?.mail?.reason || "SMTP test did not send");
      refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "SMTP test failed")),
  });

  const { mutate: runDiagnostic, isPending: testingDiagnostic } = useMutation({
    mutationFn: testAdminService,
    onSuccess: (data, kind) => {
      setDiagnosticResult({ kind, data, createdAt: new Date().toISOString() });
      if (data?.success) toast.success(`${kind.replace(/-/g, " ")} test passed`);
      else toast.error(data?.message || `${kind.replace(/-/g, " ")} test needs attention`);
      refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Diagnostic test failed")),
  });

  const { mutate: dryRunMigration, isPending: migrationDryRunning } = useMutation({
    mutationFn: runMigrationDryRun,
    onSuccess: (data) => {
      setDiagnosticResult({ kind: "migration dry run", data, createdAt: new Date().toISOString() });
      if (data?.success) toast.success("Migration dry run completed");
      else toast.error(data?.message || "Migration dry run needs attention");
      refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Migration dry run failed")),
  });

  const users = useMemo(() => {
    const q = userSearch.trim().toLowerCase();

    return (panel?.users || [])
      .filter((user) => {
        if (!q) return true;

        return [
          user.fullName,
          user.username,
          user.email,
          user.nativeLanguage,
          user.learningLanguage,
        ]
          .filter(Boolean)
          .some((value) => safeLower(value).includes(q));
      })
      .filter((user) => {
        if (userFilter === "all") return true;
        if (userFilter === "banned") return Boolean(user.activeBan);
        if (userFilter === "fullBanned") return user.activeBan?.type === "full";
        if (userFilter === "mods") return user.role === "mod";
        if (userFilter === "admins") return Boolean(user.isAdmin);
        if (userFilter === "unverified") return !user.emailVerified;
        if (userFilter === "verifiedBadge") {
          return user.badges?.includes("verified");
        }
        if (userFilter === "online") return Boolean(user.isOnline);

        return true;
      });
  }, [panel?.users, userFilter, userSearch]);

  const reports = panel?.reports || [];
  const appeals = panel?.appeals || [];
  const posts = panel?.posts || [];
  const messages = panel?.messages || [];
  const counts = panel?.counts || {};

  const handleAdminPost = async (payload) => {
    if (!payload || typeof payload !== "object") {
      toast.error("Could not read this post");
      return;
    }

    if (hasBannerOnly(payload)) {
      toast.error("Add text or real media before posting a banner");
      return;
    }

    if (!isValidPostPayload(payload)) {
      toast.error("Write something or add media before posting");
      return;
    }

    await createAdminPost(payload);
  };

  if (authLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </PageShell>
    );
  }

  if (!authUser?.isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-[1.5rem] border border-base-300 bg-base-100 p-8 text-center shadow-sm">
          <ShieldCheckIcon className="mx-auto size-10 text-base-content/35" />
          <h1 className="mt-4 text-2xl font-bold">Admin only</h1>
          <p className="mt-2 text-sm text-base-content/55">
            You do not have permission to view this page.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs text-base-content/55">
            <ShieldCheckIcon className="size-3.5" />
            Admin workspace
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Admin Panel
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-base-content/55">
            Manage moderation, reports, appeals, users, mail, bot behavior, and
            local diagnostics.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm rounded-xl"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          Refresh
        </button>
      </header>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <InlineError error={panelError} fallback="Could not load admin panel" />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && (
            <div className="space-y-5">
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Users" value={counts.users || 0} icon={UserCogIcon} />
                <Stat label="Posts" value={counts.posts || 0} icon={DatabaseIcon} />
                <Stat
                  label="Open Reports"
                  value={counts.openReports || 0}
                  icon={MessageSquareWarningIcon}
                />
                <Stat
                  label="Open Appeals"
                  value={counts.openAppeals || 0}
                  icon={BellIcon}
                />
                <Stat
                  label="Timed Bans"
                  value={counts.activeBans || 0}
                  icon={ShieldCheckIcon}
                />
                <Stat
                  label="Full Bans"
                  value={counts.activeFullBans || 0}
                  icon={ShieldCheckIcon}
                />
                <Stat
                  label="Message Bans"
                  value={counts.activeMessageBans || 0}
                  icon={MessageSquareWarningIcon}
                />
                <Stat
                  label="Shadow Bans"
                  value={counts.activeShadowBans || 0}
                  icon={ShieldCheckIcon}
                />
              </section>

              <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <SoftCard className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Email</h2>
                    <StatusPill tone={panel?.smtp?.configured ? "success" : "warning"}>
                      SMTP {panel?.smtp?.configured ? "ready" : "off"}
                    </StatusPill>
                  </div>

                  <p className="mt-2 text-sm text-base-content/55">
                    {panel?.smtp?.configured
                      ? `${panel.smtp.fromEmail} via ${panel.smtp.host}`
                      : "SMTP is off. Codes may print in the terminal."}
                  </p>

                  <button
                    className="btn btn-outline btn-xs mt-3 rounded-xl"
                    disabled={testingSmtp}
                    onClick={() => testSmtp()}
                  >
                    {testingSmtp ? (
                      <LoaderIcon className="size-3 animate-spin" />
                    ) : (
                      <MailIcon className="size-3" />
                    )}
                    Send test
                  </button>
                </SoftCard>

                <SoftCard className="p-4">
                  <h2 className="font-semibold">Content</h2>
                  <p className="mt-2 text-sm text-base-content/55">
                    {counts.reposts || 0} reposts · {counts.archivedPosts || 0} archived posts.
                  </p>
                </SoftCard>

                <SoftCard className="p-4">
                  <h2 className="font-semibold">Verification</h2>
                  <p className="mt-2 text-sm text-base-content/55">
                    {counts.verifiedEmails || 0} verified emails ·{" "}
                    {counts.verifiedBadges || 0} check badges.
                  </p>
                </SoftCard>
              </section>
            </div>
          )}

          {activeTab === "users" && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
                <SearchBox
                  value={userSearch}
                  onChange={setUserSearch}
                  placeholder="Search users, emails, languages"
                />

                <select
                  className="select select-bordered rounded-2xl bg-base-100"
                  value={userFilter}
                  onChange={(event) => setUserFilter(event.target.value)}
                >
                  {userFilters.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {users.length === 0 ? (
                <EmptyState
                  icon={UserCogIcon}
                  title="No users found"
                  description="Try another search or filter."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {users.map((user) => (
                    <SoftCard key={user._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <UserIdentity user={user} />

                        <div className="flex shrink-0 gap-2">
                          <button
                            className="btn btn-outline btn-xs rounded-xl"
                            onClick={() => setModal({ mode: "action", user })}
                          >
                            Moderate
                          </button>
                          <button
                            className="btn btn-ghost btn-xs rounded-xl"
                            onClick={() => setModal({ mode: "notify", user })}
                          >
                            Message
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill>{user.role || "user"}</StatusPill>
                        <StatusPill tone={user.emailVerified ? "success" : "warning"}>
                          {user.emailVerified ? "email verified" : "email needed"}
                        </StatusPill>
                        <StatusPill tone={user.activeBan ? "error" : "neutral"}>
                          {user.activeBan ? user.activeBan.type : "no ban"}
                        </StatusPill>
                        <StatusPill>{user.followerCount || 0} followers</StatusPill>
                        <StatusPill>{user.reportHistoryCount || 0} reports</StatusPill>
                        <StatusPill>{user.appealHistoryCount || 0} appeals</StatusPill>
                        {user.isOnline && <StatusPill tone="success">online</StatusPill>}
                      </div>

                      {user.activeBan && (
                        <p className="mt-3 line-clamp-2 text-xs text-base-content/55">
                          Ban reason: {user.activeBan.reason || "No reason"} ·{" "}
                          {user.activeBan.until
                            ? formatDate(user.activeBan.until)
                            : "admin unban required"}
                        </p>
                      )}
                    </SoftCard>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "reports" && (
            <section className="space-y-3">
              {reports.length === 0 ? (
                <EmptyState icon={FlagIcon} title="No reports yet" />
              ) : (
                reports.map((report) => (
                  <SoftCard key={report._id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={report.status === "open" ? "warning" : "neutral"}>
                        {report.status}
                      </StatusPill>
                      <StatusPill>{report.targetType}</StatusPill>
                      <StatusPill>{report.category || "other"}</StatusPill>
                      <StatusPill
                        tone={
                          report.severity === "critical"
                            ? "error"
                            : report.severity === "high"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {report.severity || "medium"}
                      </StatusPill>
                      <span className="text-xs text-base-content/45">
                        By {report.reporter?.fullName || "Unknown"} ·{" "}
                        {formatDate(report.createdAt)}
                      </span>
                    </div>

                    <p className="mt-3 font-semibold">{report.reason}</p>

                    {report.details && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/65">
                        {report.details}
                      </p>
                    )}

                    {report.target && (
                      <div className="mt-3 rounded-2xl border border-base-300 bg-base-200/50 p-3 text-sm">
                        <p className="font-semibold">Target preview</p>
                        <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-base-content/65">
                          {report.target.text ||
                            report.target.message ||
                            report.target.label ||
                            "Media or profile target"}
                        </p>
                      </div>
                    )}

                    {report.status === "open" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="btn btn-primary btn-sm rounded-xl"
                          disabled={reportPending}
                          onClick={() =>
                            updateReport({
                              id: report._id,
                              payload: {
                                status: "resolved",
                                resolution: "Reviewed and resolved by admin",
                              },
                            })
                          }
                        >
                          Resolve
                        </button>

                        <button
                          className="btn btn-outline btn-sm rounded-xl"
                          disabled={reportPending}
                          onClick={() =>
                            updateReport({
                              id: report._id,
                              payload: {
                                status: "dismissed",
                                resolution: "Reviewed and dismissed by admin",
                              },
                            })
                          }
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </SoftCard>
                ))
              )}
            </section>
          )}

          {activeTab === "appeals" && (
            <section className="space-y-3">
              {appeals.length === 0 ? (
                <EmptyState icon={BellIcon} title="No appeals yet" />
              ) : (
                appeals.map((appeal) => (
                  <SoftCard key={appeal._id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={
                          appeal.status === "approved"
                            ? "success"
                            : appeal.status === "open"
                            ? "warning"
                            : "error"
                        }
                      >
                        {appeal.status}
                      </StatusPill>
                      <StatusPill>{appeal.banType || "ban"}</StatusPill>
                      <span className="text-xs text-base-content/45">
                        {appeal.user?.fullName || "User"} ·{" "}
                        {formatDate(appeal.createdAt)}
                      </span>
                    </div>

                    <div className="mt-3 rounded-2xl border border-base-300 bg-base-200/50 p-3 text-sm">
                      <p>
                        <span className="font-semibold">Ban reason:</span>{" "}
                        {appeal.banReason ||
                          appeal.user?.activeBan?.reason ||
                          "Not recorded"}
                      </p>
                      <p>
                        <span className="font-semibold">Ban until:</span>{" "}
                        {appeal.banUntil
                          ? formatDate(appeal.banUntil)
                          : "Admin review required"}
                      </p>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-base-content/70">
                      {appeal.text || "No appeal text"}
                    </p>

                    {appeal.response && (
                      <p className="mt-2 text-sm text-base-content/55">
                        Response: {appeal.response}
                      </p>
                    )}

                    {(() => {
                      const botReview = (panel?.botAppealReviews || []).find(
                        (review) => review.appealId === appeal._id
                      );
                      if (!botReview) return null;

                      return (
                        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone="primary">ModBot review</StatusPill>
                            <span className="text-xs text-base-content/45">
                              {botReview.decision || "admin review"} ·{" "}
                              {Math.round((botReview.confidence || 0) * 100)}%
                            </span>
                          </div>

                          <p className="mt-2 text-base-content/70">
                            {botReview.professionalReasonStaff ||
                              botReview.professionalReasonUser ||
                              "No bot review note was saved."}
                          </p>
                        </div>
                      );
                    })()}

                    {appeal.status === "open" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="btn btn-primary btn-sm rounded-xl"
                          disabled={botAppealReviewing}
                          onClick={() => requestBotAppealReview(appeal._id)}
                        >
                          {botAppealReviewing ? (
                            <LoaderIcon className="size-4 animate-spin" />
                          ) : (
                            <BotIcon className="size-4" />
                          )}
                          Ask ModBot
                        </button>

                        <button
                          className="btn btn-success btn-sm rounded-xl text-white"
                          disabled={appealPending}
                          onClick={() =>
                            updateAppeal({
                              id: appeal._id,
                              payload: {
                                status: "approved",
                                response:
                                  "Appeal approved. Your account restriction has been cleared.",
                              },
                            })
                          }
                        >
                          Approve and unban
                        </button>

                        <button
                          className="btn btn-outline btn-sm rounded-xl"
                          disabled={appealPending}
                          onClick={() =>
                            updateAppeal({
                              id: appeal._id,
                              payload: {
                                status: "denied",
                                response: "Appeal denied after admin review.",
                              },
                            })
                          }
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </SoftCard>
                ))
              )}
            </section>
          )}

          {activeTab === "content" && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <h2 className="font-semibold">Posts and reposts</h2>

                {posts.length === 0 ? (
                  <EmptyState title="No posts found" />
                ) : (
                  posts.slice(0, 80).map((post) => {
                    const display = post.repostOf || post;

                    return (
                      <SoftCard key={post._id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              @{post.author?.username || "unknown"}{" "}
                              {post.repostOf ? "reposted" : "posted"}
                            </p>
                            <p className="text-xs text-base-content/45">
                              {formatDate(post.createdAt)} ·{" "}
                              {display.archived ? "archived" : "visible"}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <button
                              className="btn btn-outline btn-xs rounded-xl"
                              disabled={rescanningTarget}
                              onClick={() =>
                                rescanTarget({
                                  targetType: "post",
                                  targetId: post.repostOf?._id || post._id,
                                })
                              }
                            >
                              {rescanningTarget ? (
                                <LoaderIcon className="size-3 animate-spin" />
                              ) : (
                                <BotIcon className="size-3" />
                              )}
                              Rescan
                            </button>

                            <button
                              className="btn btn-error btn-xs rounded-xl text-white"
                              disabled={deletingPost}
                              onClick={() => {
                                if (window.confirm("Delete this post?")) {
                                  removePost(post._id);
                                }
                              }}
                            >
                              <Trash2Icon className="size-3" />
                              Delete
                            </button>
                          </div>
                        </div>

                        {post.repostOf?.unavailable ? (
                          <div className="mt-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                            Original post unavailable to this viewer.
                          </div>
                        ) : (
                          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-base-content/70">
                            {display.text || "Media post"}
                          </p>
                        )}
                      </SoftCard>
                    );
                  })
                )}
              </div>

              <div className="space-y-3">
                <h2 className="font-semibold">Recent messages</h2>

                {messages.length === 0 ? (
                  <EmptyState title="No messages found" />
                ) : (
                    messages.slice(0, 80).map((message) => (
                      <SoftCard key={message._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm">
                          <span className="font-semibold">
                            {message.senderUser?.fullName || message.sender}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold">
                            {message.recipientUser?.fullName || message.recipient}
                          </span>
                        </p>

                        <button
                          className="btn btn-outline btn-xs rounded-xl"
                          disabled={rescanningTarget}
                          onClick={() =>
                            rescanTarget({
                              targetType: "message",
                              targetId: message._id,
                            })
                          }
                        >
                          {rescanningTarget ? (
                            <LoaderIcon className="size-3 animate-spin" />
                          ) : (
                            <BotIcon className="size-3" />
                          )}
                          Rescan
                        </button>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/65">
                        {message.deletedAt
                          ? "Message deleted"
                          : message.text || "Attachment or voice message"}
                      </p>

                      {message.editHistory?.length > 0 && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-base-content/55">
                            Edit history ({message.editHistory.length})
                          </summary>

                          <div className="mt-2 space-y-2">
                            {message.editHistory.map((edit, index) => (
                              <div
                                key={`${message._id}-${index}`}
                                className="rounded-xl bg-base-200/70 p-2"
                              >
                                <p>Before: {edit.previousText}</p>
                                <p>After: {edit.nextText}</p>
                                <p className="text-base-content/45">
                                  {formatDate(edit.editedAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </SoftCard>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === "bot" && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <SoftCard className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Local ModBot training</h2>
                      <p className="mt-1 text-sm text-base-content/55">
                        These rules stay in your local store and guide moderation behavior.
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {panel?.botHealth?.enabled ? "Engine on" : "Engine off"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {botFields.map(([field, label]) => (
                      <label key={field} className="block space-y-2">
                        <span className="text-sm font-medium">{label}</span>
                        <textarea
                          className="textarea textarea-bordered min-h-24 w-full rounded-2xl bg-base-100"
                          value={botForm[field] || ""}
                          onChange={(event) => {
                            setBotDirty(true);
                            setBotForm((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary mt-4 rounded-xl"
                    disabled={savingBot}
                    onClick={() => saveBotTraining(botForm)}
                  >
                    {savingBot ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <BotIcon className="size-4" />
                    )}
                    Save bot training
                  </button>
                </SoftCard>

                <SoftCard className="p-5">
                  <h2 className="font-semibold">Runtime settings</h2>
                  <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-sm text-base-content/65">
                    <p className="font-semibold text-base-content">Current action policy</p>
                    <p className="mt-1 leading-6">
                      Medium issues warn users, high-confidence issues can mute/restrict, and critical safety issues can trigger a temporary ban.
                      Full bans, admin changes, user deletion, and audit-log changes stay blocked from bot control.
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {botSettingToggles.map(([field, label]) => (
                      <label
                        key={field}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-200/40 px-3 py-2 text-sm"
                      >
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary toggle-sm"
                          checked={Boolean(botSettingsForm[field])}
                          onChange={(event) => {
                            setBotSettingsDirty(true);
                            setBotSettingsForm((current) => ({
                              ...current,
                              [field]: event.target.checked,
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      ["lowConfidenceAction", "Low confidence"],
                      ["mediumConfidenceAction", "Medium confidence"],
                      ["highConfidenceAction", "High confidence"],
                      ["criticalConfidenceAction", "Critical confidence"],
                    ].map(([field, label]) => (
                      <label key={field} className="space-y-1 text-sm">
                        <span className="font-medium">{label}</span>
                        <select
                          className="select select-bordered w-full rounded-xl"
                          value={botSettingsForm[field] || "log"}
                          onChange={(event) => {
                            setBotSettingsDirty(true);
                            setBotSettingsForm((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }));
                          }}
                        >
                          {botActionOptions.map((option) => (
                            <option key={option} value={option}>
                              {option.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ["maxMuteMinutes", "Max mute minutes"],
                      ["actionCooldownMs", "Action cooldown ms"],
                      ["maxActionsPerUserPerHour", "Actions/user/hour"],
                    ].map(([field, label]) => (
                      <label key={field} className="space-y-1 text-sm">
                        <span className="font-medium">{label}</span>
                        <input
                          type="number"
                          className="input input-bordered w-full rounded-xl"
                          value={botSettingsForm[field] ?? ""}
                          onChange={(event) => {
                            setBotSettingsDirty(true);
                            setBotSettingsForm((current) => ({
                              ...current,
                              [field]: Number(event.target.value),
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary mt-4 rounded-xl"
                    disabled={savingBotSettings}
                    onClick={() => saveBotSettings(botSettingsForm)}
                  >
                    {savingBotSettings ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <SettingsIcon className="size-4" />
                    )}
                    Save bot settings
                  </button>
                </SoftCard>
              </div>

              <div className="space-y-4">
                <SoftCard className="p-5">
                  <h2 className="font-semibold">Bot health</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Model", panel?.botHealth?.modelProvider || "local fallback"],
                      ["Ollama", panel?.botHealth?.ollama?.enabled ? "Enabled" : "Off"],
                      ["Ollama model", panel?.botHealth?.ollama?.model || "none"],
                      ["Text model", panel?.botHealth?.textModel || "none"],
                      ["Reply model", panel?.botHealth?.replyModel || "deterministic"],
                      ["Auto powers", panel?.botHealth?.moderationPowers?.autoActions ? "Enabled" : "Review only"],
                      ["High action", panel?.botHealth?.moderationPowers?.highConfidenceAction || "log"],
                      ["Critical action", panel?.botHealth?.moderationPowers?.criticalConfidenceAction || "log"],
                      ["Temp bans", panel?.botHealth?.moderationPowers?.tempBan ? "Allowed" : "Off"],
                      ["Pending actions", panel?.botHealth?.pendingActions ?? 0],
                      ["Applied actions", panel?.botHealth?.appliedActions ?? 0],
                      ["Audit events", panel?.botHealth?.auditCount ?? 0],
                      ["Profile", panel?.botHealth?.profileReady ? "Ready" : "Missing"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-base-200/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-base-content/45">{label}</p>
                        <p className="mt-1 break-words font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </SoftCard>

                <SoftCard className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Ollama routing</h2>
                    <StatusPill tone={panel?.botHealth?.ollama?.enabled ? "success" : "warning"}>
                      {panel?.botHealth?.ollama?.enabled ? "Connected" : "Fallback"}
                    </StatusPill>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(panel?.botModelRouting || panel?.botHealth?.ollama?.routing || {}).map(
                      ([task, model]) => (
                        <div key={task} className="rounded-2xl bg-base-200/50 p-3">
                          <p className="text-xs uppercase tracking-wide text-base-content/45">
                            {task.replace(/([A-Z])/g, " $1")}
                          </p>
                          <p className="mt-1 break-words font-semibold">{model || "not configured"}</p>
                        </div>
                      )
                    )}
                  </div>
                </SoftCard>

                <SoftCard className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Recent bot scans</h2>
                    <span className="text-xs text-base-content/45">
                      {(panel?.botContentScans || []).length} text ·{" "}
                      {(panel?.botImageScans || []).length} image
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(panel?.botContentScans || []).slice(0, 6).length === 0 ? (
                      <p className="rounded-2xl bg-base-200/50 p-4 text-sm text-base-content/55">
                        No saved bot scans yet.
                      </p>
                    ) : (
                      (panel?.botContentScans || []).slice(0, 6).map((scan) => (
                        <div key={scan._id || `${scan.targetType}-${scan.createdAt}`} className="rounded-2xl border border-base-300 bg-base-100 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">
                              {scan.targetType || "content"} · {scan.category || "general"}
                            </p>
                            <StatusPill
                              tone={
                                scan.severity === "critical" || scan.severity === "high"
                                  ? "error"
                                  : scan.severity === "medium"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {scan.severity || "none"} · {scan.recommendedAction || scan.actionType || "log"}
                            </StatusPill>
                          </div>
                          <p className="mt-2 line-clamp-2 text-base-content/60">
                            {scan.reasonUser || scan.reasonStaff || scan.reason || "No scan note."}
                          </p>
                          <p className="mt-2 text-xs text-base-content/40">
                            {scan.modelUsed || scan.model || "rules"} · {formatDate(scan.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </SoftCard>

                <SoftCard className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Bot memory and appeals</h2>
                    <span className="text-xs text-base-content/45">
                      {(panel?.botMemories || []).length} memories ·{" "}
                      {(panel?.botAppealReviews || []).length} reviews
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {(panel?.botMemories || []).slice(0, 4).map((memory) => (
                      <div key={memory._id} className="rounded-2xl bg-base-200/50 p-3 text-sm">
                        <p className="font-semibold">
                          {memory.user?.fullName || "User memory"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-base-content/60">
                          {memory.summary ||
                            Object.entries(memory.casual || {})
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ") ||
                            "No safe casual notes saved."}
                        </p>
                      </div>
                    ))}

                    {(panel?.botAppealReviews || []).slice(0, 4).map((review) => (
                      <div key={review._id} className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone="primary">{review.decision || "admin review"}</StatusPill>
                          <span className="text-xs text-base-content/45">
                            {Math.round((review.confidence || 0) * 100)}% · {review.modelUsed || "model"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-base-content/65">
                          {review.professionalReasonStaff ||
                            review.professionalReasonUser ||
                            "No appeal review note."}
                        </p>
                      </div>
                    ))}

                    {(panel?.botMemories || []).length === 0 &&
                      (panel?.botAppealReviews || []).length === 0 && (
                        <p className="rounded-2xl bg-base-200/50 p-4 text-sm text-base-content/55">
                          No memory or appeal review records yet.
                        </p>
                      )}
                  </div>
                </SoftCard>

                <SoftCard className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Bot action queue</h2>
                    <span className="text-xs text-base-content/45">
                      {(panel?.botActions || []).length} recent
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(panel?.botActions || []).length === 0 ? (
                      <p className="rounded-2xl bg-base-200/50 p-4 text-sm text-base-content/55">
                        No bot actions yet. New scans will appear here.
                      </p>
                    ) : (
                      (panel?.botActions || []).slice(0, 12).map((action) => (
                        <div
                          key={action._id}
                          className="rounded-2xl border border-base-300 bg-base-100 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">
                                {action.actionType?.replace(/_/g, " ")} · {action.status}
                              </p>
                              <p className="mt-1 text-sm text-base-content/60">
                                {action.reason}
                              </p>
                            </div>
                            <span className="rounded-full bg-base-200 px-2.5 py-1 text-xs">
                              {action.severity} · {Math.round((action.confidence || 0) * 100)}%
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-base-content/45">
                            {action.targetType} · {action.targetUser?.fullName || "Unknown"} · {formatDate(action.createdAt)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {action.status === "needs_review" && (
                              <>
                                <button
                                  className="btn btn-success btn-xs rounded-lg"
                                  disabled={reviewingBotAction}
                                  onClick={() =>
                                    reviewBotAction({
                                      id: action._id,
                                      action: "approve",
                                      payload: { reason: "Approved from bot queue" },
                                    })
                                  }
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs rounded-lg"
                                  disabled={reviewingBotAction}
                                  onClick={() =>
                                    reviewBotAction({
                                      id: action._id,
                                      action: "reject",
                                      payload: { reason: "Rejected from bot queue" },
                                    })
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {action.status === "applied" && action.reversible && (
                              <button
                                className="btn btn-warning btn-xs rounded-lg"
                                disabled={reviewingBotAction}
                                onClick={() =>
                                  reviewBotAction({
                                    id: action._id,
                                    action: "undo",
                                    payload: { reason: "Undone from bot queue" },
                                  })
                                }
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SoftCard>
              </div>
            </section>
          )}

          {activeTab === "mail" && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SoftCard className="p-5">
                <h2 className="font-semibold">Send staff message</h2>

                <div className="mt-4 space-y-3">
                  <select
                    className="select select-bordered w-full rounded-xl"
                    value={mailUserId}
                    onChange={(event) => setMailUserId(event.target.value)}
                  >
                    <option value="">Choose user</option>
                    {(panel?.users || []).map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.fullName} (@{user.username})
                      </option>
                    ))}
                  </select>

                  <input
                    className="input input-bordered w-full rounded-xl"
                    value={mailForm.title}
                    onChange={(event) => {
                      setMailDirty(true);
                      setMailForm({ ...mailForm, title: event.target.value });
                    }}
                    placeholder="Title"
                  />

                  <textarea
                    className="textarea textarea-bordered min-h-32 w-full rounded-xl"
                    value={mailForm.message}
                    onChange={(event) => {
                      setMailDirty(true);
                      setMailForm({ ...mailForm, message: event.target.value });
                    }}
                    placeholder="Message"
                  />

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={mailForm.email}
                      onChange={(event) => {
                        setMailDirty(true);
                        setMailForm({ ...mailForm, email: event.target.checked });
                      }}
                    />
                    <span>Also send email if SMTP is configured</span>
                  </label>

                  <button
                    className="btn btn-primary w-full rounded-xl"
                    disabled={!mailUserId || !mailForm.message.trim() || notifyPending}
                    onClick={() =>
                      notifyUser({
                        userId: mailUserId,
                        payload: {
                          ...mailForm,
                          title: mailForm.title.trim() || "Message from moderation",
                          message: panel?.adminSettings?.staffSignature
                            ? `${mailForm.message.trim()}\n\n${panel.adminSettings.staffSignature}`
                            : mailForm.message.trim(),
                        },
                      })
                    }
                  >
                    {notifyPending ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <MailIcon className="size-4" />
                    )}
                    Send
                  </button>
                </div>
              </SoftCard>

              <div className="space-y-3">
                <h2 className="font-semibold">Outreach and email events</h2>

                {(panel?.outreachEvents || []).slice(0, 20).map((event) => (
                  <SoftCard key={event._id} className="p-3 text-sm">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-base-content/50">
                      To {event.targetUser?.fullName || "user"} by{" "}
                      {event.staff?.fullName || "staff"} ·{" "}
                      {formatDate(event.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-base-content/65">
                      {event.message}
                    </p>
                  </SoftCard>
                ))}

                {(panel?.mailEvents || []).slice(0, 12).map((event) => (
                  <SoftCard key={event.id} className="p-3 text-sm">
                    <p className="font-semibold">{event.subject}</p>
                    <p className={event.sent ? "text-success" : "text-warning"}>
                      {event.sent ? "Sent" : event.reason || "Failed"} ·{" "}
                      {formatDate(event.createdAt)}
                    </p>
                  </SoftCard>
                ))}

                {(panel?.outreachEvents || []).length === 0 &&
                  (panel?.mailEvents || []).length === 0 && (
                    <EmptyState icon={MailIcon} title="No mail events yet" />
                  )}
              </div>
            </section>
          )}

          {activeTab === "audit" && (
            <SoftCard className="overflow-hidden">
              {(panel?.moderationActions || []).length === 0 ? (
                <EmptyState icon={ShieldCheckIcon} title="No audit actions yet" />
              ) : (
                <div className="divide-y divide-base-300">
                  {(panel?.moderationActions || []).map((action) => (
                    <div
                      key={action._id}
                      className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        <span className="font-semibold">
                          {action.staff?.fullName || "Staff"}
                        </span>{" "}
                        applied{" "}
                        <span className="font-semibold">
                          {actionLabels[action.type] || action.type}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold">
                          {action.targetUser?.fullName || "user"}
                        </span>
                        {" · "}
                        {action.reason}
                      </span>

                      <span className="shrink-0 text-xs text-base-content/45">
                        {formatDate(action.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SoftCard>
          )}

          {activeTab === "diagnostics" &&
            (() => {
              const diagnostics = panel?.diagnostics || {};
              const database = diagnostics.database || {};
              const redis = diagnostics.redis || {};
              const sightengine = diagnostics.sightengine || {};
              const workers = diagnostics.queues?.workers || {};
              const botQueue = diagnostics.queues?.bot || {};
              const storage = diagnostics.storage || {};
              const turn = diagnostics.turn || {};
              const smtp = diagnostics.smtp || panel?.smtp || {};

              return (
                <section className="space-y-4">
                  <SoftCard className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">Server diagnostics</h2>
                        <p className="mt-1 text-sm text-base-content/55">
                          Production readiness without exposing secrets.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={diagnostics.ready ? "success" : "warning"}>
                          {diagnostics.ready ? "ready" : "needs attention"}
                        </StatusPill>
                        <StatusPill>{diagnostics.localDev ? "local mode" : "production mode"}</StatusPill>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ["mongo", "Test MongoDB"],
                        ["redis", "Test Redis"],
                        ["sightengine-text", "Test Sightengine text"],
                        ["sightengine-image", "Test Sightengine image"],
                        ["upload", "Test upload"],
                        ["ollama", "Test Ollama"],
                      ].map(([kind, label]) => (
                        <button
                          key={kind}
                          type="button"
                          className="btn btn-outline btn-xs rounded-xl"
                          disabled={testingDiagnostic}
                          onClick={() => runDiagnostic(kind)}
                        >
                          {testingDiagnostic ? <LoaderIcon className="size-3 animate-spin" /> : null}
                          {label}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline btn-xs rounded-xl"
                        disabled={testingSmtp}
                        onClick={() => testSmtp()}
                      >
                        {testingSmtp ? <LoaderIcon className="size-3 animate-spin" /> : null}
                        Test SMTP
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary btn-xs rounded-xl"
                        disabled={migrationDryRunning}
                        onClick={() => dryRunMigration()}
                      >
                        {migrationDryRunning ? <LoaderIcon className="size-3 animate-spin" /> : null}
                        Migration dry run
                      </button>
                    </div>

                    {diagnosticResult && (
                      <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/50 p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            Last result: {diagnosticResult.kind}
                          </p>
                          <span className="text-base-content/45">
                            {formatDate(diagnosticResult.createdAt)}
                          </span>
                        </div>
                        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-base-content/60">
                          {JSON.stringify(diagnosticResult.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Database</p>
                        <p className="mt-2 text-base-content/60">
                          {database.driver || "local_json"}{" "}
                          {database.mongoMode && database.mongoMode !== "none"
                            ? `(${database.mongoMode})`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          {database.connected ? "Connected" : "Offline"} · {database.message || "No status"}
                        </p>
                        <p className="mt-2 truncate text-xs text-base-content/45">
                          Local file: {panel?.dbPath || "not using local JSON"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Redis</p>
                        <p className="mt-2 text-base-content/60">
                          {redis.connected ? "Connected" : "Memory fallback"}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          Required: {redis.required ? "yes" : "no"} · Socket adapter:{" "}
                          {redis.features?.socketAdapter ? "on" : "off"}
                        </p>
                        <p className="mt-2 text-xs text-base-content/45">
                          Rate limits: {redis.features?.rateLimits ? "Redis-ready" : "memory/local"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Moderation providers</p>
                        <p className="mt-2 text-base-content/60">
                          {diagnostics.providers?.detection || "rules_ollama"}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          Decision: {diagnostics.providers?.decision || "rules_ollama"}
                        </p>
                        <p className="mt-2 text-xs text-base-content/45">
                          Appeals: {diagnostics.providers?.appealReviewer || "admin_review"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Sightengine</p>
                        <p className="mt-2 text-base-content/60">
                          {sightengine.configured ? "Configured" : "Optional fallback"}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          Enabled: {sightengine.enabled ? "yes" : "no"} · Strictness:{" "}
                          {sightengine.strictness || "medium"}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs text-base-content/45">
                          {sightengine.lastError || "No provider errors recorded."}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Ollama and bot queue</p>
                        <p className="mt-2 text-base-content/60">
                          {diagnostics.ollama?.enabled
                            ? diagnostics.ollama?.healthy
                              ? "Ollama healthy"
                              : "Ollama waiting"
                            : "Ollama off"}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          Pending: {botQueue.pending ?? 0} · Running: {botQueue.running ?? 0}
                        </p>
                        <p className="mt-2 text-xs text-base-content/45">
                          Models checked: {(diagnostics.ollama?.models || []).length}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Workers</p>
                        <p className="mt-2 text-base-content/60">
                          {workers.targetWorkers || 1} target worker(s)
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          CPU: {workers.cpuCount || 1} · Fraction:{" "}
                          {Math.round((workers.cpuFraction || 0) * 100)}%
                        </p>
                        <p className="mt-2 text-xs text-base-content/45">
                          Queue backend: {workers.queueBackend || "memory"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Storage</p>
                        <p className="mt-2 text-base-content/60">
                          {storage.driver || "local"}
                        </p>
                        <p className="mt-1 truncate text-xs text-base-content/45">
                          Media: {panel?.mediaDir || "Unknown"}
                        </p>
                        <p className="mt-2 truncate text-xs text-base-content/45">
                          Uploads: {storage.uploadDir || storage.publicUrl || "local uploads"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Email</p>
                        <p className="mt-2 text-base-content/60">
                          {smtp.configured ? "SMTP ready" : "Terminal fallback"}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          {smtp.configured
                            ? `${smtp.fromEmail} via ${smtp.host}:${smtp.port}`
                            : "Codes and alerts can print locally."}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                        <p className="font-semibold">Calls and activity</p>
                        <p className="mt-2 text-base-content/60">
                          TURN {turn.configured ? "configured" : turn.enabled ? "needs credentials" : "off"}
                        </p>
                        <p className="mt-1 text-xs text-base-content/45">
                          Calls recorded: {counts.callHistory || 0} · Users in call:{" "}
                          {counts.usersInCall || 0}
                        </p>
                        <p className="mt-2 text-xs text-base-content/45">
                          Comments: {counts.comments || 0}
                        </p>
                      </div>
                    </div>
                  </SoftCard>
                </section>
              );
            })()}

          {activeTab === "settings" && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <SoftCard className="p-5">
                <h2 className="font-semibold">Admin settings</h2>
                <p className="mt-1 text-sm text-base-content/55">
                  Defaults used by moderation, reports, outreach, and refresh timing.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="form-control">
                    <span className="label-text mb-1">Default ban days</span>
                    <input
                      className="input input-bordered rounded-xl"
                      type="number"
                      min="1"
                      max="365"
                      value={settingsForm.defaultBanDays || 7}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          defaultBanDays: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">Auto refresh seconds</span>
                    <input
                      className="input input-bordered rounded-xl"
                      type="number"
                      min="3"
                      max="60"
                      value={settingsForm.autoRefreshSeconds || 5}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          autoRefreshSeconds: event.target.value,
                        });
                      }}
                    />
                  </label>
                </div>

                <div className="mt-3 space-y-3">
                  <label className="form-control">
                    <span className="label-text mb-1">Default moderation reason</span>
                    <input
                      className="input input-bordered rounded-xl"
                      value={settingsForm.defaultModerationReason || ""}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          defaultModerationReason: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">Default staff message title</span>
                    <input
                      className="input input-bordered rounded-xl"
                      value={settingsForm.defaultStaffTitle || ""}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          defaultStaffTitle: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">Staff signature</span>
                    <textarea
                      className="textarea textarea-bordered min-h-24 rounded-xl"
                      value={settingsForm.staffSignature || ""}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          staffSignature: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">Report categories</span>
                    <textarea
                      className="textarea textarea-bordered min-h-40 rounded-xl"
                      value={settingsForm.reportCategoriesText || ""}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          reportCategoriesText: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={Boolean(settingsForm.requireEmailForStaffOutreach)}
                      onChange={(event) => {
                        setSettingsDirty(true);
                        setSettingsForm({
                          ...settingsForm,
                          requireEmailForStaffOutreach: event.target.checked,
                        });
                      }}
                    />
                    <span>Prefer email for staff outreach when SMTP is ready</span>
                  </label>

                  <button
                    className="btn btn-primary rounded-xl"
                    disabled={savingSettings}
                    onClick={() =>
                      saveAdminSettings({
                        ...settingsForm,
                        defaultBanDays: Math.min(
                          365,
                          Math.max(1, Number(settingsForm.defaultBanDays) || 7)
                        ),
                        autoRefreshSeconds: Math.min(
                          60,
                          Math.max(3, Number(settingsForm.autoRefreshSeconds) || 5)
                        ),
                        reportCategories: splitLines(
                          settingsForm.reportCategoriesText
                        ),
                      })
                    }
                  >
                    {savingSettings ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <SettingsIcon className="size-4" />
                    )}
                    Save settings
                  </button>
                </div>
              </SoftCard>

              <aside className="space-y-3">
                <SoftCard className="p-4">
                  <h3 className="font-semibold">Current defaults</h3>
                  <div className="mt-3 space-y-2 text-sm text-base-content/65">
                    <p>Ban length: {panel?.adminSettings?.defaultBanDays || 7} days</p>
                    <p>
                      Reason:{" "}
                      {panel?.adminSettings?.defaultModerationReason ||
                        "Community safety"}
                    </p>
                    <p>
                      Outreach title:{" "}
                      {panel?.adminSettings?.defaultStaffTitle ||
                        "Message from moderation"}
                    </p>
                  </div>
                </SoftCard>

                <SoftCard className="p-4">
                  <h3 className="font-semibold">Categories</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(panel?.adminSettings?.reportCategories || []).map(
                      (category) => (
                        <StatusPill key={category}>{category}</StatusPill>
                      )
                    )}
                  </div>
                </SoftCard>
              </aside>
            </section>
          )}

          {activeTab === "create" && (
            <SoftCard className="max-w-3xl p-5">
              <h2 className="mb-4 font-semibold">Create admin post</h2>
              <PostComposer
                authUser={authUser}
                onPost={handleAdminPost}
                isPending={posting}
              />
            </SoftCard>
          )}
        </>
      )}

      <ModerationModal
        mode={modal.mode}
        user={modal.user}
        adminSettings={panel?.adminSettings}
        onClose={() => setModal({ mode: null, user: null })}
        onApply={(userId, action) => applyAction({ userId, action })}
        onNotify={(userId, payload) => notifyUser({ userId, payload })}
        isBusy={actionPending || notifyPending}
      />
    </PageShell>
  );
}
