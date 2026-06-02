import { createElement, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  AlertCircleIcon,
  Clock3Icon,
  DatabaseIcon,
  FolderIcon,
  HardDriveIcon,
  LoaderIcon,
  LockKeyholeIcon,
  PhoneCallIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  UsersIcon,
} from "lucide-react";

import { getDebugInfo } from "../lib/api";

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatWhen(value) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({ label, value, icon: Icon, description }) {
  return (
    <section className="rounded-[1.35rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-base-content/50">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {formatNumber(value)}
          </p>
        </div>

        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-base-200 text-base-content/55">
          {createElement(Icon, { className: "size-5" })}
        </div>
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-base-content/45">
          {description}
        </p>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-full place-items-center bg-base-100 p-8">
      <div className="flex flex-col items-center gap-3">
        <span className="loading loading-spinner loading-lg" />
        <p className="text-sm text-base-content/50">
          Loading local diagnostics...
        </p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry, isFetching }) {
  return (
    <div className="grid min-h-full place-items-center bg-base-100 p-6">
      <section className="w-full max-w-md rounded-[1.5rem] border border-error/25 bg-error/10 p-6 text-error shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />

          <div className="min-w-0">
            <h1 className="font-semibold">Could not load diagnostics</h1>
            <p className="mt-1 text-sm leading-6 opacity-80">
              {error?.response?.data?.message ||
                error?.message ||
                "The debug endpoint did not respond."}
            </p>

            <button
              type="button"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-base-100 px-4 text-sm font-semibold text-base-content shadow-sm transition hover:bg-base-200 disabled:opacity-50"
              onClick={onRetry}
              disabled={isFetching}
            >
              {isFetching ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Retry
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PathCard({ dbPath, mediaDir }) {
  return (
    <section className="rounded-[1.35rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <FolderIcon className="size-4 text-base-content/45" />
            Local paths
          </h2>
          <p className="mt-1 text-sm text-base-content/45">
            Paths are shown for local development only.
          </p>
        </div>

        <div className="grid size-9 place-items-center rounded-full bg-base-200 text-base-content/45">
          <HardDriveIcon className="size-4" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-base-300 bg-base-200/45 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
            Database
          </p>
          <p className="mt-1 break-all text-sm text-base-content/70">
            {dbPath || "Unknown"}
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-200/45 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
            Media
          </p>
          <p className="mt-1 break-all text-sm text-base-content/70">
            {mediaDir || "Unknown"}
          </p>
        </div>
      </div>
    </section>
  );
}

function UsersPanel({ users = [], query, setQuery }) {
  const filteredUsers = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return users;

    return users.filter((user) => {
      return [
        user.fullName,
        user.username,
        user.email,
        user._id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(cleanQuery));
    });
  }, [users, query]);

  return (
    <section className="rounded-[1.35rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <UsersIcon className="size-4 text-base-content/45" />
            Users
          </h2>
          <p className="mt-1 text-sm text-base-content/45">
            Local user presence and call state.
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/35" />
          <input
            className="input input-bordered h-10 w-full rounded-2xl bg-base-100 pl-10 text-sm sm:w-56"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-base-300 bg-base-200/45 p-5 text-center text-sm text-base-content/50">
          No users found.
        </div>
      ) : (
        <div className="max-h-[26rem] space-y-1 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div
              key={user._id || user.username || user.fullName}
              className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-base-200/65"
            >
              <span
                className={[
                  "size-2.5 shrink-0 rounded-full",
                  user.inCall
                    ? "bg-warning"
                    : user.isOnline
                      ? "bg-success"
                      : "bg-base-content/25",
                ].join(" ")}
                title={user.inCall ? "In call" : user.isOnline ? "Online" : "Offline"}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {user.fullName || user.username || "Unknown user"}
                </p>
                <p className="truncate text-xs text-base-content/45">
                  @{user.username || "unknown"}
                </p>
              </div>

              {user.inCall && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                  call
                </span>
              )}

              {user.isOnline && !user.inCall && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                  online
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CallsPanel({ calls = [] }) {
  return (
    <section className="rounded-[1.35rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <PhoneCallIcon className="size-4 text-base-content/45" />
            Recent calls
          </h2>
          <p className="mt-1 text-sm text-base-content/45">
            Latest call sessions reported by this server.
          </p>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="rounded-2xl border border-base-300 bg-base-200/45 p-5 text-center text-sm text-base-content/50">
          No recent calls.
        </div>
      ) : (
        <div className="max-h-[26rem] space-y-2 overflow-y-auto">
          {calls.map((call) => (
            <div
              key={call._id || call.callId}
              className="rounded-2xl border border-base-300 bg-base-200/35 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">
                  {call.status || "unknown"}
                </p>

                <span className="rounded-full bg-base-100 px-2 py-0.5 text-xs text-base-content/50">
                  {call.durationSeconds || 0}s
                </span>
              </div>

              <p className="mt-1 truncate text-xs text-base-content/45">
                {call.callId || "No call id"}
              </p>

              {(call.createdAt || call.startedAt) && (
                <p className="mt-2 flex items-center gap-1 text-xs text-base-content/40">
                  <Clock3Icon className="size-3.5" />
                  {formatWhen(call.createdAt || call.startedAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DebugPage() {
  const [query, setQuery] = useState("");

  const {
    data: debugInfo,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["debug"],
    queryFn: getDebugInfo,
    refetchInterval: 3000,
    retry: 1,
  });

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => refetch()}
        isFetching={isFetching}
      />
    );
  }

  const counts = debugInfo?.counts || {};
  const users = Array.isArray(debugInfo?.users) ? debugInfo.users : [];
  const recentCalls = Array.isArray(debugInfo?.recentCalls)
    ? debugInfo.recentCalls
    : [];

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 border-b border-base-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
              <LockKeyholeIcon className="size-3.5" />
              Admin diagnostics
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Local Diagnostics
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/50">
              Live server health, local store paths, users, and call activity
              from this PC.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-base-200 px-4 text-sm font-semibold text-base-content/65 transition hover:bg-base-300 hover:text-base-content disabled:opacity-50"
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

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Users"
            value={counts.users}
            icon={UsersIcon}
            description="Total accounts in local store."
          />

          <StatCard
            label="Online"
            value={counts.activeUsers}
            icon={ActivityIcon}
            description="Users marked active right now."
          />

          <StatCard
            label="Posts"
            value={counts.posts}
            icon={DatabaseIcon}
            description="Public and stored posts."
          />

          <StatCard
            label="In Call"
            value={counts.usersInCall}
            icon={PhoneCallIcon}
            description="Users currently in calls."
          />
        </div>

        <PathCard dbPath={debugInfo?.dbPath} mediaDir={debugInfo?.mediaDir} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <UsersPanel users={users} query={query} setQuery={setQuery} />
          <CallsPanel calls={recentCalls} />
        </div>

        <section className="rounded-[1.35rem] border border-warning/25 bg-warning/10 p-4 text-sm leading-6 text-warning">
          <div className="flex gap-3">
            <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />
            <p>
              Keep this page admin-only. It may expose local paths, call IDs,
              user presence, and server diagnostics that normal users should not
              see.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
