import {
  CheckCircle2Icon,
  Clock3Icon,
  Globe2Icon,
  LaptopIcon,
  LoaderIcon,
  LogOutIcon,
  MapPinIcon,
  MonitorSmartphoneIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
} from "lucide-react";

function getSessionId(session) {
  return session?.id || session?._id || session?.sessionId || "";
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

function getDeviceLabel(session) {
  if (session?.deviceName) return session.deviceName;

  const browser = session?.browser || "Browser";
  const os = session?.os || "Device";

  return `${browser} on ${os}`;
}

function getLocation(session) {
  return (
    session?.loginOrigin ||
    session?.approximateLocation ||
    session?.location ||
    session?.city ||
    "Unknown location"
  );
}

function getCountry(session) {
  return (
    session?.loginCountry ||
    session?.locationDetails?.country ||
    session?.locationDetails?.countryCode ||
    ""
  );
}

function getIpAddress(session) {
  return session?.ipAddress || session?.ip || "Local/private";
}

function DeviceBadge({ type, children }) {
  const styles = {
    current: "bg-success/10 text-success",
    trusted: "bg-primary/10 text-primary",
    normal: "bg-base-200 text-base-content/55",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        styles[type] || styles.normal,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function DeviceSkeleton() {
  return (
    <div className="divide-y divide-base-300 overflow-hidden rounded-[1.45rem] border border-base-300 bg-base-100">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex animate-pulse gap-3 p-4">
          <div className="size-11 rounded-2xl bg-base-300" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 rounded-full bg-base-300" />
            <div className="h-3 w-64 max-w-full rounded-full bg-base-300" />
            <div className="h-3 w-52 max-w-full rounded-full bg-base-300" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DeviceSessionList({
  sessions = [],
  isLoading = false,
  onRevoke,
  onLogoutOthers,
  onTrust,
  busySessionId,
  busyAll = false,
}) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const hasMultipleSessions = safeSessions.length > 1;

  if (isLoading) {
    return <DeviceSkeleton />;
  }

  if (!safeSessions.length) {
    return (
      <div className="rounded-[1.45rem] border border-base-300 bg-base-100 p-6 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-base-200 text-base-content/45">
          <MonitorSmartphoneIcon className="size-6" />
        </div>

        <p className="mt-3 font-semibold">No active devices found</p>

        <p className="mt-1 text-sm leading-6 text-base-content/50">
          When you sign in on this account, your active devices will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold tracking-tight">Logged-in devices</h3>
            <p className="mt-1 text-sm leading-5 text-base-content/50">
              Manage browsers and devices currently connected to your account.
            </p>
          </div>

          <span className="rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/55">
            {safeSessions.length} active
          </span>
        </div>
      </div>

      <div className="divide-y divide-base-300">
        {safeSessions.map((session) => {
          const sessionId = getSessionId(session);
          const busy = busySessionId === sessionId;
          const current = Boolean(session.current);
          const trusted = Boolean(session.trusted);
          const country = getCountry(session);

          return (
            <article
              key={sessionId}
              className="flex flex-col gap-3 p-3.5 transition hover:bg-base-200/35 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex min-w-0 gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-base-200 text-base-content/55">
                  <LaptopIcon className="size-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">
                      {getDeviceLabel(session)}
                    </p>

                    {current && (
                      <DeviceBadge type="current">
                        <CheckCircle2Icon className="size-3" />
                        Current
                      </DeviceBadge>
                    )}

                    {trusted && (
                      <DeviceBadge type="trusted">
                        <ShieldCheckIcon className="size-3" />
                        Trusted
                      </DeviceBadge>
                    )}
                  </div>

                  <div className="mt-2 grid gap-1 text-sm text-base-content/50">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <Globe2Icon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {session.browser || "Browser"} · {session.os || "OS"} ·{" "}
                        {getIpAddress(session)}
                      </span>
                    </p>

                    <p className="flex min-w-0 items-center gap-1.5">
                      <MapPinIcon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        Logged in from {getLocation(session)}
                        {country && !getLocation(session).includes(country)
                          ? ` • ${country}`
                          : ""}
                      </span>
                    </p>

                    <p className="flex min-w-0 items-center gap-1.5 text-xs text-base-content/40">
                      <Clock3Icon className="size-3.5 shrink-0" />
                      <span>
                        Last active{" "}
                        {formatWhen(session.lastSeenAt || session.createdAt)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {onTrust && (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 text-sm font-semibold text-base-content/65 transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => onTrust(sessionId, !trusted)}
                    disabled={busy || !sessionId}
                  >
                    {busy ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : trusted ? (
                      <ShieldOffIcon className="size-4" />
                    ) : (
                      <ShieldCheckIcon className="size-4" />
                    )}
                    {trusted ? "Untrust" : "Trust"}
                  </button>
                )}

                {onRevoke && (
                  <button
                    type="button"
                    className={[
                      "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                      current
                        ? "border border-base-300 bg-base-100 text-base-content/65 hover:bg-base-200 hover:text-base-content"
                        : "bg-error/10 text-error hover:bg-error/15",
                    ].join(" ")}
                    onClick={() => onRevoke(sessionId)}
                    disabled={busy || !sessionId}
                  >
                    {busy ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <LogOutIcon className="size-4" />
                    )}
                    {current ? "Log out this device" : "Log out"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {onLogoutOthers && hasMultipleSessions && (
        <div className="flex flex-col gap-3 border-t border-base-300 bg-base-200/45 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm leading-5 text-base-content/55">
            Remove access from old browsers or shared devices without affecting
            this one.
          </p>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-base-100 px-4 text-sm font-semibold text-base-content/70 shadow-sm transition hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onLogoutOthers}
            disabled={busyAll}
          >
            {busyAll ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <LogOutIcon className="size-4" />
            )}
            Log out others
          </button>
        </div>
      )}
    </section>
  );
}
