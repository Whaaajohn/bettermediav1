import { LoaderIcon, MessageCircleIcon } from "lucide-react";

function ChatLoader({
  label = "Connecting to chat...",
  description = "Loading messages and syncing status",
  fullScreen = false,
}) {
  return (
    <div
      className={[
        "flex items-center justify-center bg-base-100 px-4 text-base-content",
        fullScreen ? "min-h-[100dvh]" : "h-full min-h-[18rem]",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative grid size-16 place-items-center rounded-[1.35rem] border border-base-300 bg-base-100 shadow-sm sm:size-20 sm:rounded-[1.6rem]">
          <div className="absolute inset-0 rounded-[inherit] bg-primary/5" />

          <MessageCircleIcon className="relative size-8 text-primary sm:size-9" />

          <div className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border border-base-300 bg-base-100 shadow-sm">
            <LoaderIcon className="size-4 animate-spin text-primary" />
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold">{label}</p>

        {description && (
          <p className="mt-1 max-w-xs text-xs leading-5 text-base-content/45">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatLoader;