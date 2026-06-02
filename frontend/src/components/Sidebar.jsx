import { Link, useLocation } from "react-router";
import { createElement } from "react";
import useAuthUser from "../hooks/useAuthUser";
import {
  BellIcon,
  HomeIcon,
  MessageCircleIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShipWheelIcon,
} from "lucide-react";

import CreatePostModal from "./CreatePostModal";
import UserBadges from "./UserBadges";
import { makeLocalAvatar } from "../lib/utils";

const navItems = [
  ["/", "Feed", HomeIcon],
  ["/messages", "Messages", MessageCircleIcon],
  ["/explore", "Explore", SearchIcon],
  ["/notifications", "Notifications", BellIcon],
  ["/settings", "Settings", SettingsIcon],
];

function isActivePath(currentPath, to) {
  if (to === "/") return currentPath === "/";
  return currentPath === to || currentPath.startsWith(`${to}/`);
}

function NavLinkItem({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition",
        active
          ? "bg-base-300/70 text-base-content"
          : "text-base-content/65 hover:bg-base-300/45 hover:text-base-content",
      ].join(" ")}
    >
      {createElement(Icon, {
        className: [
          "size-5 shrink-0 transition",
          active
            ? "text-base-content"
            : "text-base-content/55 group-hover:text-base-content",
        ].join(" "),
      })}

      <span className="truncate">{label}</span>
    </Link>
  );
}

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const { pathname } = useLocation();

  const avatarSrc =
    authUser?.profilePic ||
    makeLocalAvatar(authUser?.fullName || authUser?.username || "User");

  const profilePath = authUser?._id ? `/profile/${authUser._id}` : "/login";

  const items = authUser?.isAdmin
    ? [...navItems, ["/admin", "Admin", ShieldCheckIcon]]
    : navItems;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-base-300 bg-base-100/95 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="px-4 py-4">
        <Link
          to="/"
          className="flex h-12 items-center gap-2 rounded-2xl px-2 transition hover:bg-base-200/70"
        >
          <ShipWheelIcon className="size-8 shrink-0 text-primary" />

          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight">
              BetterMedia
            </p>
            <p className="-mt-0.5 text-xs text-base-content/45">
              Local social
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(([to, label, Icon]) => (
          <NavLinkItem
            key={to}
            to={to}
            label={label}
            icon={Icon}
            active={isActivePath(pathname, to)}
          />
        ))}
      </nav>

      <div className="px-3 pb-3">
        <CreatePostModal
          triggerClassName="btn btn-primary w-full rounded-2xl justify-center gap-2 normal-case min-h-11"
          triggerLabel="Create post"
        />
      </div>

      <div className="border-t border-base-300 p-3">
        <Link
          to={profilePath}
          className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-base-200/75"
        >
          <div className="avatar shrink-0">
            <div className="w-10 overflow-hidden rounded-full bg-base-300">
              <img
                src={avatarSrc}
                alt={authUser?.fullName || "User avatar"}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-semibold">
                {authUser?.fullName || "User"}
              </p>

              <UserBadges badges={authUser?.badges || []} compact />
            </div>

            <p className="truncate text-xs text-base-content/50">
              @{authUser?.username || "username"}
            </p>
          </div>

          <span
            className="size-2 rounded-full bg-success"
            title="Online"
            aria-label="Online"
          />
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
