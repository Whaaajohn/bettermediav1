import {
  BellIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import { createElement } from "react";

function EmptyHint({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/50">
      {createElement(Icon, { className: "size-3.5" })}
      {label}
    </div>
  );
}

function NoNotificationsFound({
  title = "No notifications yet",
  description = "When something important happens, it will show up here.",
}) {
  return (
    <section className="flex min-h-[22rem] flex-col items-center justify-center px-4 py-14 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative grid size-16 place-items-center rounded-3xl border border-base-300 bg-base-100 shadow-sm">
          <BellIcon className="size-8 text-base-content/35" />
        </div>
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-base-content/50">
        {description}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <EmptyHint icon={UserPlusIcon} label="Follow requests" />
        <EmptyHint icon={MessageCircleIcon} label="Messages" />
        <EmptyHint icon={ShieldCheckIcon} label="Security" />
      </div>
    </section>
  );
}

export default NoNotificationsFound;
