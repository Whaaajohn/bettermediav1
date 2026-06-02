import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

const fallbackInterests = [
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "sports", label: "Sports" },
  { id: "coding", label: "Coding" },
  { id: "ai", label: "AI" },
  { id: "news", label: "News" },
  { id: "memes", label: "Memes" },
  { id: "movies", label: "Movies" },
  { id: "fitness", label: "Fitness" },
  { id: "school", label: "School" },
  { id: "language_learning", label: "Language Learning" },
  { id: "local_community", label: "Local Community" },
  { id: "tech", label: "Tech" },
  { id: "fashion", label: "Fashion" },
  { id: "food", label: "Food" },
];

function normalizeOption(option) {
  if (typeof option === "string") {
    return {
      id: option.toLowerCase().replace(/\s+/g, "_"),
      label: option,
    };
  }

  return {
    id: option?.id || option?.value || option?.label,
    label: option?.label || option?.name || option?.id || "Interest",
    description: option?.description || "",
  };
}

export default function InterestPicker({
  options = fallbackInterests,
  value = [],
  onChange,
  compact = false,
  disabled = false,
  maxSelected = 0,
  minSelected = 0,
  showSearch = false,
  showCounter = true,
  title = "Interests",
  description = "Choose topics you want to see more often.",
}) {
  const [query, setQuery] = useState("");

  const safeValue = Array.isArray(value) ? value : [];
  const selected = useMemo(() => new Set(safeValue), [safeValue]);

  const normalizedOptions = useMemo(() => {
    const list = options?.length ? options : fallbackInterests;

    return list
      .map(normalizeOption)
      .filter((item) => item.id && item.label);
  }, [options]);

  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return normalizedOptions;

    return normalizedOptions.filter((item) => {
      return (
        item.label.toLowerCase().includes(cleanQuery) ||
        item.id.toLowerCase().includes(cleanQuery) ||
        item.description?.toLowerCase().includes(cleanQuery)
      );
    });
  }, [normalizedOptions, query]);

  const selectedCount = safeValue.length;
  const maxReached = maxSelected > 0 && selectedCount >= maxSelected;

  const toggle = (id) => {
    if (disabled) return;

    const active = selected.has(id);

    if (active && selectedCount <= minSelected) return;

    if (!active && maxReached) return;

    const next = active
      ? safeValue.filter((item) => item !== id)
      : [...safeValue, id];

    onChange?.(next);
  };

  const clearAll = () => {
    if (disabled || selectedCount <= minSelected) return;
    onChange?.([]);
  };

  return (
    <section className="space-y-3">
      {(title || description || showCounter) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            )}

            {description && (
              <p className="mt-1 text-sm leading-5 text-base-content/50">
                {description}
              </p>
            )}
          </div>

          {showCounter && (
            <div className="shrink-0 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/55">
              {selectedCount}
              {maxSelected > 0 ? `/${maxSelected}` : ""} selected
            </div>
          )}
        </div>
      )}

      {showSearch && normalizedOptions.length > 8 && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/35" />

          <input
            className="input input-bordered h-10 w-full rounded-2xl bg-base-100 pl-10 pr-10 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search interests"
            disabled={disabled}
          />

          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-base-content/40 transition hover:bg-base-200 hover:text-base-content"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      <div
        className={[
          "flex flex-wrap gap-2",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        {filteredOptions.map((interest) => {
          const active = selected.has(interest.id);
          const blocked = !active && maxReached;

          return (
            <button
              key={interest.id}
              type="button"
              disabled={disabled || blocked}
              aria-pressed={active}
              title={interest.description || interest.label}
              className={[
                "group inline-flex items-center gap-1.5 rounded-full border font-semibold shadow-sm transition",
                "focus:outline-none focus:ring-2 focus:ring-primary/25",
                compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
                active
                  ? "border-primary/30 bg-primary text-primary-content"
                  : "border-base-300 bg-base-100 text-base-content/65 hover:border-base-content/15 hover:bg-base-200 hover:text-base-content",
                blocked ? "cursor-not-allowed opacity-45" : "hover:-translate-y-0.5",
              ].join(" ")}
              onClick={() => toggle(interest.id)}
            >
              {active && (
                <CheckIcon
                  className={compact ? "size-3" : "size-3.5"}
                  strokeWidth={3}
                />
              )}

              <span>{interest.label}</span>
            </button>
          );
        })}

        {filteredOptions.length === 0 && (
          <div className="w-full rounded-2xl border border-base-300 bg-base-100 p-5 text-center">
            <p className="text-sm font-semibold">No interests found</p>
            <p className="mt-1 text-xs text-base-content/45">
              Try a different search.
            </p>
          </div>
        )}
      </div>

      {selectedCount > 0 && !compact && (
        <div className="flex items-center justify-between gap-3 text-xs text-base-content/45">
          <p>
            {maxSelected > 0 && maxReached
              ? "Maximum selected."
              : "Tap an interest again to remove it."}
          </p>

          <button
            type="button"
            className="font-semibold text-base-content/55 transition hover:text-base-content"
            onClick={clearAll}
            disabled={disabled || selectedCount <= minSelected}
          >
            Clear all
          </button>
        </div>
      )}
    </section>
  );
}