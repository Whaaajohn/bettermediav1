import { createElement } from "react";
import { Link } from "react-router";
import {
  BookOpenIcon,
  HeartHandshakeIcon,
  ShieldCheckIcon,
  ShipWheelIcon,
  UsersRoundIcon,
} from "lucide-react";

const appName = "BetterMedia";

const docTabs = [
  {
    label: "About",
    to: "/docs#about",
    icon: HeartHandshakeIcon,
  },
  {
    label: "Socials",
    to: "/docs#socials",
    icon: UsersRoundIcon,
  },
  {
    label: "Safety",
    to: "/docs#safety",
    icon: ShieldCheckIcon,
  },
  {
    label: "Docs",
    to: "/docs",
    icon: BookOpenIcon,
  },
  {
    label: "Privacy",
    to: "/docs#privacy",
    icon: ShieldCheckIcon,
  },
  {
    label: "Terms",
    to: "/docs#terms",
    icon: BookOpenIcon,
  },
];

function LogoLink({ compact = false }) {
  return (
    <Link
      to="/"
      className="group flex min-w-0 items-center gap-2 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={`${appName} home`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
        <ShipWheelIcon className="size-5" />
      </span>

      {!compact && (
        <span className="truncate text-xl font-bold tracking-tight">
          {appName}
        </span>
      )}
    </Link>
  );
}

function DocsNav({ limit = 4, className = "" }) {
  return (
    <nav
      className={[
        "items-center gap-1 rounded-full border border-base-300 bg-base-100/80 p-1 text-sm text-base-content/60 shadow-sm",
        className,
      ].join(" ")}
      aria-label="Documentation navigation"
    >
      {docTabs.slice(0, limit).map(({ label, to, icon }) => (
        <Link
          key={label}
          to={to}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          {createElement(icon, { className: "size-3.5" })}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AuthHeader({
  actionTo = "/signup",
  actionLabel = "Create account",
  mobileLabel = actionLabel,
  trailing,
  rightSlot,
  showAction = true,
} = {}) {
  const trailingSlot = trailing || rightSlot;

  return (
    <header className="sticky top-0 z-30 border-b border-base-300/70 bg-base-100/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <LogoLink />

        <DocsNav className="hidden md:flex" />

        <div className="flex shrink-0 items-center gap-2">
          {trailingSlot && (
            <div className="hidden items-center md:flex">{trailingSlot}</div>
          )}

          {showAction && actionTo && (
            <Link
              to={actionTo}
              className="hidden h-10 items-center rounded-full border border-base-300 bg-base-100 px-4 text-sm font-semibold text-base-content/65 shadow-sm transition hover:bg-base-200 hover:text-base-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:inline-flex"
            >
              {actionLabel}
            </Link>
          )}

          {trailingSlot && (
            <div className="flex items-center md:hidden">{trailingSlot}</div>
          )}

          {showAction && actionTo && (
            <Link
              to={actionTo}
              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-base-content/70 transition hover:bg-base-200 hover:text-base-content md:hidden"
            >
              {mobileLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function AuthFooter() {
  return (
    <footer className="border-t border-base-300/70 bg-base-100">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <LogoLink compact />
              <span className="font-semibold tracking-tight">{appName}</span>
              <span className="text-sm text-base-content/40">
                © {new Date().getFullYear()}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-base-content/45">
              Built for private communities, language practice, messaging,
              calls, moderation, local testing, and production-ready hosting.
            </p>
          </div>

          <nav
            className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:justify-end"
            aria-label="Footer navigation"
          >
            {docTabs.map(({ label, to, icon }) => (
              <Link
                key={label}
                to={to}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3 py-2 text-base-content/55 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                {createElement(icon, { className: "size-3.5" })}
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}