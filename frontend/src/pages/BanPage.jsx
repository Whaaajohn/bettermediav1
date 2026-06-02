import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  FileTextIcon,
  HomeIcon,
  LoaderIcon,
  LogOutIcon,
  MailIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuthUser from "../hooks/useAuthUser";
import { createAppeal, getMyAppeals, logout } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const APPEAL_MIN_LENGTH = 20;
const APPEAL_MAX_LENGTH = 1200;

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

function getRemaining(until, requiresAdminUnban = false) {
  if (requiresAdminUnban) return "Waiting for admin review";
  if (!until) return "Until staff clears it";

  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return "Invalid end date";

  const diff = date.getTime() - Date.now();

  if (diff <= 0) return "Expired - refresh your account";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${Math.max(1, minutes)}m remaining`;
}

function getStatusClass(status = "open") {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return "border-success/30 bg-success/10 text-success";
  }

  if (normalized === "denied" || normalized === "rejected") {
    return "border-error/30 bg-error/10 text-error";
  }

  if (normalized === "closed") {
    return "border-base-300 bg-base-200 text-base-content/60";
  }

  return "border-warning/30 bg-warning/10 text-warning";
}

function DetailCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="flex items-center gap-2 text-xs text-base-content/45">
        {createElement(Icon, { className: "size-4" })}
        <span>{label}</span>
      </div>

      <p className="mt-2 font-semibold text-base-content">{value}</p>
    </div>
  );
}

function AppealStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
        status
      )}`}
    >
      {status || "open"}
    </span>
  );
}

export default function BanPage() {
  const { authUser, isLoading: authLoading } = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [appealText, setAppealText] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  const ban = authUser?.activeBan;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const {
    data: appeals = [],
    isLoading: appealsLoading,
    error: appealsError,
    refetch: refetchAppeals,
  } = useQuery({
    queryKey: ["myAppeals"],
    queryFn: getMyAppeals,
    enabled: Boolean(authUser?._id && ban),
    refetchInterval: 15000,
    retry: 1,
  });

  const openAppeal = useMemo(() => {
    return appeals.find((appeal) => {
      const status = String(appeal.status || "").toLowerCase();
      return status === "open" || status === "pending" || status === "reviewing";
    });
  }, [appeals]);

  const appealLength = appealText.trim().length;

  const canSubmitAppeal =
    appealLength >= APPEAL_MIN_LENGTH &&
    appealLength <= APPEAL_MAX_LENGTH &&
    !openAppeal;

  const remainingText = useMemo(() => {
    void nowTick;
    return getRemaining(ban?.until, ban?.requiresAdminUnban);
  }, [ban?.until, ban?.requiresAdminUnban, nowTick]);

  const { mutate: sendAppeal, isPending: sendingAppeal } = useMutation({
    mutationFn: createAppeal,
    onSuccess: () => {
      setAppealText("");
      toast.success("Appeal sent to staff");
      queryClient.invalidateQueries({ queryKey: ["myAppeals"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not send appeal"));
    },
  });

  const { mutate: logoutMutation, isPending: loggingOut } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/login");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not log out"));
    },
  });

  const handleSubmitAppeal = (event) => {
    event.preventDefault();

    const text = appealText.trim();

    if (openAppeal) {
      toast.error("You already have an open appeal");
      return;
    }

    if (text.length < APPEAL_MIN_LENGTH) {
      toast.error(`Appeal must be at least ${APPEAL_MIN_LENGTH} characters`);
      return;
    }

    if (text.length > APPEAL_MAX_LENGTH) {
      toast.error(`Appeal must be under ${APPEAL_MAX_LENGTH} characters`);
      return;
    }

    sendAppeal({ text });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-100 grid place-items-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-base-100 px-4 py-10">
        <div className="mx-auto max-w-md rounded-[1.6rem] border border-base-300 bg-base-100 p-6 text-center shadow-sm">
          <ShieldAlertIcon className="mx-auto size-10 text-base-content/45" />
          <h1 className="mt-4 text-2xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-base-content/55">
            You need to sign in before viewing account restrictions.
          </p>

          <Link to="/login" className="btn btn-primary mt-5 rounded-xl">
            Go to sign in
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!ban) {
    return (
      <div className="min-h-screen bg-base-100 px-4 py-10">
        <div className="mx-auto max-w-md rounded-[1.6rem] border border-base-300 bg-base-100 p-6 text-center shadow-sm">
          <CheckCircle2Icon className="mx-auto size-11 text-success" />
          <h1 className="mt-4 text-2xl font-bold">No active restriction</h1>
          <p className="mt-2 text-sm text-base-content/55">
            Your account does not currently have an active ban.
          </p>

          <Link to="/" className="btn btn-primary mt-5 rounded-xl">
            <HomeIcon className="size-4" />
            Continue to app
          </Link>
        </div>
      </div>
    );
  }

  const isFullBan = ban?.type === "full";
  const isPermanent = isFullBan || ban?.requiresAdminUnban;

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-error/20 bg-error/10 px-3 py-1 text-xs font-medium text-error">
              <ShieldAlertIcon className="size-3.5" />
              Account restriction
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {isFullBan
                ? "Your account is banned"
                : "Your account is temporarily restricted"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-base-content/60">
              Review the details below. If you believe this was a mistake, you
              can fight the decision by sending one clear appeal for staff to review.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm rounded-xl"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["authUser"] });
                refetchAppeals();
              }}
            >
              <RefreshCwIcon className="size-4" />
              Refresh
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm rounded-xl"
              onClick={() => logoutMutation()}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <LogOutIcon className="size-4" />
              )}
              Log out
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[1.8rem] border border-error/25 bg-base-100 shadow-sm">
              <div className="border-b border-error/15 bg-error/10 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="grid size-14 place-items-center rounded-2xl bg-error/10 text-error">
                    <ShieldAlertIcon className="size-8" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-error/80">
                      Restriction status
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      {isPermanent ? "Staff review required" : remainingText}
                    </h2>

                    <p className="mt-1 text-sm text-base-content/60">
                      {isPermanent
                        ? "This restriction stays active until staff clears it."
                        : "This restriction may expire automatically when the timer ends."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
                <DetailCard
                  icon={ShieldAlertIcon}
                  label="Ban type"
                  value={ban?.type ? ban.type : "Unknown"}
                />

                <DetailCard
                  icon={TimerIcon}
                  label="Original length"
                  value={
                    ban?.days
                      ? `${ban.days} days`
                      : isPermanent
                      ? "Indefinite"
                      : "Not recorded"
                  }
                />

                <DetailCard
                  icon={CalendarClockIcon}
                  label="Issued"
                  value={formatDate(ban?.issuedAt)}
                />

                <DetailCard
                  icon={CalendarClockIcon}
                  label="Ends"
                  value={
                    ban?.until && !ban?.requiresAdminUnban
                      ? formatDate(ban.until)
                      : "Staff must clear it"
                  }
                />
              </div>

              <div className="border-t border-base-300 p-5 sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangleIcon className="size-4 text-base-content/50" />
                  <p className="font-semibold">Reason</p>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-200/50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-base-content/75">
                    {ban?.reason || "No reason was provided."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="size-5 text-base-content/50" />
                    <h2 className="text-lg font-semibold">Fight this decision</h2>
                  </div>

                  <p className="mt-1 text-sm text-base-content/55">
                    Explain clearly what happened, what changed, and why the restriction should be reduced or removed.
                  </p>
                </div>
              </div>

              {openAppeal ? (
                <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                  <p className="font-semibold">You already fought this restriction</p>
                  <p className="mt-1">
                    Staff will review your current appeal. You can see its status and response in appeal history below.
                  </p>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleSubmitAppeal}>
                  <label className="form-control">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="label-text">Your appeal</span>
                      <span
                        className={`text-xs ${
                          appealLength > APPEAL_MAX_LENGTH
                            ? "text-error"
                            : "text-base-content/40"
                        }`}
                      >
                        {appealLength}/{APPEAL_MAX_LENGTH}
                      </span>
                    </div>

                    <textarea
                      className="textarea textarea-bordered min-h-36 w-full rounded-2xl bg-base-100"
                      value={appealText}
                      onChange={(event) =>
                        setAppealText(event.target.value.slice(0, APPEAL_MAX_LENGTH))
                      }
                      placeholder="Tell staff what happened, why you think this decision should change, and what you will do differently."
                      maxLength={APPEAL_MAX_LENGTH}
                      disabled={sendingAppeal}
                    />
                  </label>

                  {appealLength > 0 && appealLength < APPEAL_MIN_LENGTH && (
                    <p className="text-xs text-base-content/45">
                      Write at least {APPEAL_MIN_LENGTH} characters so staff has
                      enough context.
                    </p>
                  )}

                  <button
                    className="btn btn-primary w-full rounded-xl"
                    disabled={!canSubmitAppeal || sendingAppeal}
                    type="submit"
                  >
                    {sendingAppeal ? (
                      <>
                        <LoaderIcon className="size-4 animate-spin" />
                        Sending appeal...
                      </>
                    ) : (
                      <>
                        Send appeal to staff
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </section>

            <section className="rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Appeal history</h2>
                  <p className="text-sm text-base-content/55">
                    Previous appeals and staff responses.
                  </p>
                </div>

                {appealsLoading && <LoaderIcon className="size-4 animate-spin" />}
              </div>

              {appealsError && (
                <div className="mb-4 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
                  {getApiErrorMessage(appealsError, "Could not load appeals")}
                </div>
              )}

              {appealsLoading && appeals.length === 0 ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner" />
                </div>
              ) : appeals.length === 0 ? (
                <div className="rounded-2xl border border-base-300 bg-base-200/50 p-5 text-center">
                  <FileTextIcon className="mx-auto size-8 text-base-content/35" />
                  <p className="mt-2 font-medium">No appeals yet</p>
                  <p className="mt-1 text-sm text-base-content/50">
                    Your submitted appeals will show here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appeals.map((appeal) => (
                    <article
                      key={appeal._id}
                      className="rounded-2xl border border-base-300 bg-base-100 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AppealStatusBadge status={appeal.status} />

                        <span className="text-xs text-base-content/45">
                          {formatDate(appeal.createdAt)}
                        </span>

                        <span className="text-xs text-base-content/45">
                          {appeal.banType || "ban"} appeal
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-base-content/75">
                        {appeal.text || "No appeal text provided."}
                      </p>

                      {appeal.response && (
                        <div className="mt-3 rounded-2xl border border-base-300 bg-base-200/60 p-3">
                          <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="size-4 text-base-content/50" />
                            <p className="font-semibold">Staff response</p>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-base-content/70">
                            {appeal.response}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <section className="rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm">
              <h2 className="font-semibold">What you can do</h2>

              <div className="mt-4 space-y-3 text-sm text-base-content/60">
                <div className="flex gap-3">
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
                  <p>Read the reason carefully before sending an appeal.</p>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
                  <p>Be clear, calm, and honest in your appeal.</p>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
                  <p>Wait for staff to review it instead of submitting spam.</p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <MailIcon className="size-4 text-base-content/45" />
                <h2 className="font-semibold">Staff review</h2>
              </div>

              <p className="mt-3 text-sm text-base-content/55">
                If email is configured on the server, staff may also send a
                response there. You can always check this page for updates.
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
