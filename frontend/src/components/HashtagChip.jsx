import { Link } from "react-router";
import { HashIcon, TrendingUpIcon, XIcon } from "lucide-react";

function normalizeTag(tag = "") {
  return String(tag)
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function formatCount(value) {
  const number = Number(value || 0);

  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;

  return number > 0 ? String(number) : "";
}

export default function HashtagChip({
  tag,
  compact = false,
  active = false,
  muted = false,
  trending = false,
  count = 0,
  disabled = false,
  removable = false,
  onClick,
  onRemove,
  className = "",
}) {
  const clean = normalizeTag(tag);
  if (!clean) return null;

  const path = `/hashtag/${encodeURIComponent(clean)}`;
  const countLabel = formatCount(count);

  return (
    <Link
      to={disabled ? "#" : path}
      aria-label={`Open hashtag ${clean}`}
      title={`#${clean}`}
      className={[
        "group inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold shadow-sm transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        active
          ? "border-primary/30 bg-primary text-primary-content"
          : muted
            ? "border-base-300 bg-base-200 text-base-content/40 line-through"
            : "border-primary/20 bg-primary/10 text-primary hover:border-primary/30 hover:bg-primary/15",
        disabled ? "pointer-events-none opacity-50" : "hover:-translate-y-0.5",
        className,
      ].join(" ")}
      onClick={(event) => {
        event.stopPropagation();

        if (disabled) {
          event.preventDefault();
          return;
        }

        onClick?.(clean);
      }}
    >
      {trending ? (
        <TrendingUpIcon
          className={compact ? "size-3" : "size-3.5"}
          strokeWidth={2.5}
        />
      ) : (
        <HashIcon
          className={compact ? "size-3" : "size-3.5"}
          strokeWidth={2.5}
        />
      )}

      <span className="min-w-0 truncate">#{clean}</span>

      {countLabel && (
        <span
          className={[
            "rounded-full font-bold",
            active
              ? "bg-primary-content/15 text-primary-content/85"
              : "bg-base-100/80 px-1.5 text-base-content/45",
            compact ? "text-[0.62rem]" : "text-[0.68rem]",
          ].join(" ")}
        >
          {countLabel}
        </span>
      )}

      {removable && (
        <button
          type="button"
          className={[
            "ml-0.5 grid shrink-0 place-items-center rounded-full transition",
            active
              ? "hover:bg-primary-content/15"
              : "hover:bg-base-content/10",
            compact ? "size-4" : "size-5",
          ].join(" ")}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove?.(clean);
          }}
          aria-label={`Remove hashtag ${clean}`}
        >
          <XIcon className={compact ? "size-3" : "size-3.5"} />
        </button>
      )}
    </Link>
  );
}