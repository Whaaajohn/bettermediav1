import { useMemo } from "react";
import { Link } from "react-router";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  HashIcon,
  LoaderIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import HashtagChip from "./HashtagChip.jsx";
import { getTrendingHashtags } from "../lib/api";

function normalizeTagItem(item) {
  if (typeof item === "string") {
    return {
      name: item.replace(/^#/, "").trim().toLowerCase(),
      count: 0,
      score: 0,
    };
  }

  const name = String(
    item?.normalizedName ||
      item?.name ||
      item?.tag ||
      item?.hashtag ||
      ""
  )
    .replace(/^#/, "")
    .trim()
    .toLowerCase();

  return {
    name,
    count:
      item?.postCount ||
      item?.count ||
      item?.uses ||
      item?.usageCount ||
      0,
    score: item?.trendingScore || item?.score || 0,
  };
}

function normalizeResponse(data) {
  const list = Array.isArray(data)
    ? data
    : data?.items || data?.hashtags || data?.tags || [];

  return list.map(normalizeTagItem).filter((item) => item.name);
}

function TrendingSkeleton() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-8 w-20 animate-pulse rounded-full bg-base-300"
        />
      ))}
    </div>
  );
}

export default function TrendingHashtags({
  limit = 8,
  onTagClick,
  title = "Trending",
  compact = false,
  showViewAll = true,
}) {
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["hashtags", "trending", limit],
    queryFn: () => getTrendingHashtags({ limit }),
    staleTime: 120_000,
    retry: 1,
  });

  const tags = useMemo(() => normalizeResponse(data).slice(0, limit), [data, limit]);

  return (
    <section
      className={[
        "rounded-[1.45rem] border border-base-300 bg-base-100 shadow-sm",
        compact ? "p-3" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <TrendingUpIcon className="size-4" />
            </span>
            <span className="truncate">{title}</span>
          </h2>

          {!compact && (
            <p className="mt-1 text-xs leading-5 text-base-content/45">
              Hashtags people are posting with right now.
            </p>
          )}
        </div>

        {showViewAll ? (
          <Link
            to="/explore"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
            aria-label="Open Explore"
          >
            <ArrowRightIcon className="size-4" />
          </Link>
        ) : (
          <HashIcon className="size-4 shrink-0 text-base-content/35" />
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-error/20 bg-error/10 p-3 text-sm text-error">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span>Could not load trending hashtags.</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <TrendingSkeleton />
      ) : tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <HashtagChip
              key={tag.name}
              tag={tag.name}
              compact
              trending
              count={tag.count}
              onClick={(cleanTag) => onTagClick?.(cleanTag)}
            />
          ))}

          {isFetching && (
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-base-300 px-3 text-xs text-base-content/45">
              <LoaderIcon className="size-3 animate-spin" />
              Updating
            </span>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/45 p-4 text-sm leading-5 text-base-content/55">
          Hashtags will appear here once people start posting with them.
        </div>
      )}
    </section>
  );
}