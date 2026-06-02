import { Link, useLocation } from "react-router";
import { createElement } from "react";
import {
  BellIcon,
  BotIcon,
  HomeIcon,
  LogOutIcon,
  MessageCircleIcon,
  SearchIcon,
  SettingsIcon,
  ShipWheelIcon,
  UserIcon,
} from "lucide-react";

import useAuthUser from "../hooks/useAuthUser";
import useLogout from "../hooks/useLogout";
import ThemeSelector from "./ThemeSelector";
import CreatePostModal from "./CreatePostModal";
import { makeLocalAvatar } from "../lib/utils";

function isActivePath(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function shouldHideMobileBottomNav(pathname) {
  return (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/call") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  );
}

function TopIconLink({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={[
        "grid size-10 place-items-center rounded-full transition",
        active
          ? "bg-base-300 text-base-content"
          : "text-base-content/60 hover:bg-base-200 hover:text-base-content",
      ].join(" ")}
    >
      {createElement(Icon, { className: "size-5" })}
    </Link>
  );
}

function MobileTabLink({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[0.68rem] font-medium transition active:scale-[0.97]",
        active
          ? "text-primary"
          : "text-base-content/45 hover:text-base-content",
      ].join(" ")}
    >
      {active && (
        <span className="absolute top-1 h-1 w-5 rounded-full bg-primary/80" />
      )}

      {createElement(Icon, {
        className: active ? "mt-1 size-5 stroke-[2.5]" : "mt-1 size-5",
      })}

      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function MobileProfileMenu({ avatarSrc, authUser, logoutMutation }) {
  const profilePath = authUser?._id ? `/profile/${authUser._id}` : "/login";

  const closeDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        type="button"
        className="avatar rounded-full ring-offset-base-100 transition hover:ring-2 hover:ring-primary/25 hover:ring-offset-2"
        aria-label="Open account menu"
      >
        <div className="w-9 overflow-hidden rounded-full bg-base-300">
          <img
            src={avatarSrc}
            alt={authUser?.fullName || "User avatar"}
            className="h-full w-full object-cover"
          />
        </div>
      </button>

      <ul
        tabIndex={0}
        className="dropdown-content menu z-[9999] mt-3 w-52 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-2xl"
      >
        <li>
          <Link to={profilePath} onClick={closeDropdown}>
            <UserIcon className="size-4" />
            Profile
          </Link>
        </li>

        <li>
          <Link to="/bot" onClick={closeDropdown}>
            <BotIcon className="size-4" />
            ModBot
          </Link>
        </li>

        <li>
          <Link to="/settings" onClick={closeDropdown}>
            <SettingsIcon className="size-4" />
            Settings
          </Link>
        </li>

        <li>
          <button
            type="button"
            onClick={() => {
              closeDropdown();
              logoutMutation();
            }}
          >
            <LogOutIcon className="size-4" />
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}

const Navbar = () => {
  const { authUser } = useAuthUser();
  const { logoutMutation } = useLogout();
  const { pathname } = useLocation();

  const avatarSrc =
    authUser?.profilePic ||
    makeLocalAvatar(authUser?.fullName || authUser?.username || "User");

  const profilePath = authUser?._id ? `/profile/${authUser._id}` : "/login";

  const messagesActive =
    isActivePath(pathname, "/messages") || isActivePath(pathname, "/chat");

  const hideMobileBottomNav = shouldHideMobileBottomNav(pathname);

  return (
    <>
      <nav className="sticky top-0 z-30 h-16 border-b border-base-300 bg-base-100/85 backdrop-blur-xl">
        <div className="flex h-full items-center px-4 sm:px-6 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2 rounded-2xl px-2 py-1.5 transition hover:bg-base-200/70 lg:hidden"
            >
              <ShipWheelIcon className="size-8 shrink-0 text-primary" />

              <div className="min-w-0">
                <p className="truncate text-lg font-bold tracking-tight">
                  BetterMedia
                </p>
                <p className="-mt-1 truncate text-xs text-base-content/45">
                  Local social
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-1.5 lg:flex">
            <TopIconLink
              to="/explore"
              label="Explore"
              icon={SearchIcon}
              active={isActivePath(pathname, "/explore")}
            />

            <TopIconLink
              to="/messages"
              label="Messages"
              icon={MessageCircleIcon}
              active={messagesActive}
            />

            <TopIconLink
              to="/bot"
              label="ModBot"
              icon={BotIcon}
              active={isActivePath(pathname, "/bot")}
            />

            <TopIconLink
              to="/notifications"
              label="Notifications"
              icon={BellIcon}
              active={isActivePath(pathname, "/notifications")}
            />

            <div className="mx-1 h-8 w-px bg-base-300" />

            <ThemeSelector />

            <Link
              to={profilePath}
              className="avatar rounded-full ring-offset-base-100 transition hover:ring-2 hover:ring-primary/25 hover:ring-offset-2"
              aria-label="Open profile"
              title="Profile"
            >
              <div className="w-9 overflow-hidden rounded-full bg-base-300">
                <img
                  src={avatarSrc}
                  alt={authUser?.fullName || "User avatar"}
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>

            <button
              type="button"
              className="grid size-10 place-items-center rounded-full text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
              onClick={() => logoutMutation()}
              aria-label="Log out"
              title="Log out"
            >
              <LogOutIcon className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeSelector />

            <MobileProfileMenu
              avatarSrc={avatarSrc}
              authUser={authUser}
              logoutMutation={logoutMutation}
            />
          </div>
        </div>
      </nav>

      {!hideMobileBottomNav && (
        <>
          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-base-300 bg-base-100/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-md items-center gap-1">
              <MobileTabLink
                to="/"
                label="Feed"
                icon={HomeIcon}
                active={isActivePath(pathname, "/")}
              />

              <MobileTabLink
                to="/explore"
                label="Explore"
                icon={SearchIcon}
                active={isActivePath(pathname, "/explore")}
              />

              <div className="flex flex-1 justify-center">
                <CreatePostModal
                  triggerClassName="grid size-12 place-items-center rounded-full bg-primary text-primary-content shadow-lg shadow-primary/20 transition active:scale-95"
                  triggerLabel="Post"
                  showLabel={false}
                />
              </div>

              <MobileTabLink
                to="/messages"
                label="Messages"
                icon={MessageCircleIcon}
                active={messagesActive}
              />

              <MobileTabLink
                to="/notifications"
                label="Alerts"
                icon={BellIcon}
                active={isActivePath(pathname, "/notifications")}
              />
            </div>
          </nav>

          <div className="h-[calc(4.35rem+env(safe-area-inset-bottom))] lg:hidden" />
        </>
      )}
    </>
  );
};

export default Navbar;
