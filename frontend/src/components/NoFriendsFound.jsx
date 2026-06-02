import { Link } from "react-router";
import { createElement } from "react";
import {
  MessageCircleIcon,
  SearchIcon,
  UserPlusIcon,
  UsersRoundIcon,
} from "lucide-react";

function HintPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/50">
      {createElement(Icon, { className: "size-3.5" })}
      {label}
    </span>
  );
}

const NoFriendsFound = ({
  title = "No friends yet",
  description = "Find people to follow, start conversations, and build your language circle.",
  showExploreButton = true,
}) => {
  return (
    <section className="rounded-[1.5rem] border border-base-300 bg-base-100 px-5 py-12 text-center shadow-sm">
      <div className="relative mx-auto w-fit">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative grid size-16 place-items-center rounded-3xl border border-base-300 bg-base-100 shadow-sm">
          <UsersRoundIcon className="size-8 text-base-content/35" />
        </div>
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/50">
        {description}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <HintPill icon={UserPlusIcon} label="Follow people" />
        <HintPill icon={MessageCircleIcon} label="Start chats" />
        <HintPill icon={SearchIcon} label="Explore users" />
      </div>

      {showExploreButton && (
        <Link
          to="/explore"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-content transition hover:bg-primary/90"
        >
          <SearchIcon className="size-4" />
          Find people
        </Link>
      )}
    </section>
  );
};

export default NoFriendsFound;
