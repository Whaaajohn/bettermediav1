import { createElement, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  ClockIcon,
  Globe2Icon,
  SearchIcon,
  SparklesIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import HashtagChip from "../components/HashtagChip.jsx";
import TrendingHashtags from "../components/TrendingHashtags.jsx";
import UserFollowCard from "../components/UserFollowCard";
import useAuthUser from "../hooks/useAuthUser";
import { followUser, getLanguageGroups, recordAlgorithmEvent, searchHashtags, searchUsers, unfollowUser } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const RECENT_SEARCHES_KEY = "bettermedia-recent-searches";
const OLD_RECENT_SEARCHES_KEY = "media-recent-searches";
const MIN_SEARCH_LENGTH = 2;

function loadRecentSearches() {
  try {
    const saved =
      localStorage.getItem(RECENT_SEARCHES_KEY) ||
      localStorage.getItem(OLD_RECENT_SEARCHES_KEY) ||
      "[]";

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function saveRecentSearches(items) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
  localStorage.removeItem(OLD_RECENT_SEARCHES_KEY);
}

function useDebouncedValue(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[1.5rem] border border-base-300 bg-base-100 px-5 py-12 text-center shadow-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-base-200">
        {createElement(Icon, { className: "size-6 text-base-content/45" })}
      </div>

      <h2 className="mt-4 font-semibold">{title}</h2>

      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-base-content/50">
          {description}
        </p>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [busyUserId, setBusyUserId] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 400).trim();
  const canSearch = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  const {
    data: users = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["people", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: canSearch,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: hashtags = [] } = useQuery({
    queryKey: ["hashtags", "search", debouncedQuery],
    queryFn: () => searchHashtags(debouncedQuery),
    enabled: canSearch,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: languageGroups = [] } = useQuery({
    queryKey: ["languageGroups"],
    queryFn: getLanguageGroups,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const visibleUsers = useMemo(() => {
    return (users || []).filter((user) => user?._id !== authUser?._id);
  }, [users, authUser?._id]);

  const visibleLanguageGroups = useMemo(() => {
    const groups = Array.isArray(languageGroups) ? languageGroups : [];
    if (!canSearch) return groups.slice(0, 8);
    const q = debouncedQuery.toLowerCase();
    return groups
      .filter((group) =>
        [group.name, group.language, group.type, group.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [languageGroups, canSearch, debouncedQuery]);

  useEffect(() => {
    if (!canSearch) return;

    setRecentSearches((current) => {
      const next = [
        debouncedQuery,
        ...current.filter(
          (item) => item.toLowerCase() !== debouncedQuery.toLowerCase()
        ),
      ].slice(0, 6);

      saveRecentSearches(next);
      return next;
    });
  }, [canSearch, debouncedQuery]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["people"] });
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  const { mutate: followMutation } = useMutation({
    mutationFn: followUser,
    onMutate: (userId) => {
      setBusyUserId(userId);
    },
    onSuccess: (data) => {
      refresh();
      toast.success(
        data?.status === "requested" ? "Follow requested" : "Following"
      );
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not follow"));
    },
    onSettled: () => {
      setBusyUserId(null);
    },
  });

  const { mutate: unfollowMutation } = useMutation({
    mutationFn: unfollowUser,
    onMutate: (userId) => {
      setBusyUserId(userId);
    },
    onSuccess: () => {
      refresh();
      toast.success("Unfollowed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not unfollow"));
    },
    onSettled: () => {
      setBusyUserId(null);
    },
  });

  const clearSearch = () => {
    setQuery("");
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    localStorage.removeItem(OLD_RECENT_SEARCHES_KEY);
  };

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs text-base-content/55">
            <SparklesIcon className="size-3.5" />
            Discover people
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Explore
          </h1>

          <p className="mt-2 max-w-xl text-sm text-base-content/55">
            Search people by name, username, language, email, or location.
          </p>
        </header>

        <section className="sticky top-0 z-10 -mx-1 bg-base-100/85 px-1 py-2 backdrop-blur-xl">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-base-content/40" />

            <input
              className="input input-bordered h-12 w-full rounded-2xl bg-base-100 pl-12 pr-12 text-base shadow-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
            />

            {query && (
              <button
                type="button"
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-base-content/45 hover:bg-base-200 hover:text-base-content"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </section>

        {!canSearch && recentSearches.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-base-content/45">
                <ClockIcon className="size-3.5" />
                Recent searches
              </p>

              <button
                type="button"
                className="text-xs text-base-content/45 hover:text-base-content"
                onClick={clearRecentSearches}
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-sm text-base-content/65 transition hover:bg-base-200 hover:text-base-content"
                  onClick={() => setQuery(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {!canSearch && (
          <>
            {visibleLanguageGroups.length > 0 && (
              <section className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold tracking-tight">Language groups</h2>
                    <p className="mt-1 text-xs text-base-content/45">
                      Auto-joined from native and learning languages.
                    </p>
                  </div>
                  <Globe2Icon className="size-4 text-base-content/35" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleLanguageGroups.map((group) => (
                    <Link
                      key={group.slug}
                      to={`/language-groups/${group.slug}`}
                      className="rounded-2xl border border-base-300 bg-base-200/35 p-3 transition hover:bg-base-200"
                    >
                      <p className="truncate text-sm font-bold">{group.name}</p>
                      <p className="mt-1 text-xs text-base-content/50">
                        {group.memberCount || 0} members - {group.postCount || 0} posts
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <TrendingHashtags
              onTagClick={(tag) =>
                recordAlgorithmEvent({
                  type: "hashtag_click",
                  hashtag: tag,
                  source: "search",
                }).catch(() => null)
              }
            />
          </>
        )}

        {error && (
          <div className="rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{getApiErrorMessage(error, "Could not search users")}</span>
            </div>
          </div>
        )}

        {!canSearch ? (
          <EmptyState
            icon={SearchIcon}
            title="Start searching"
            description="Type at least 2 characters. Users will not all appear here automatically anymore."
          />
        ) : isLoading || isFetching ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : visibleUsers.length === 0 && hashtags.length === 0 && visibleLanguageGroups.length === 0 ? (
          <EmptyState
            icon={UsersRoundIcon}
            title="No users found"
            description="Try a different name, username, language, location, or hashtag."
          />
        ) : (
          <section className="space-y-4">
            <p className="px-1 text-xs text-base-content/45">
              {visibleUsers.length + hashtags.length + visibleLanguageGroups.length} result{visibleUsers.length + hashtags.length + visibleLanguageGroups.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-base-content/65">
                "{debouncedQuery}"
              </span>
            </p>

            {hashtags.length > 0 && (
              <div className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag) => (
                    <HashtagChip
                      key={tag.normalizedName || tag.name}
                      tag={tag.normalizedName || tag.name}
                      onClick={(clickedTag) =>
                        recordAlgorithmEvent({
                          type: "hashtag_click",
                          hashtag: clickedTag,
                          source: "search",
                        }).catch(() => null)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {visibleLanguageGroups.length > 0 && (
              <div className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Language groups</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleLanguageGroups.map((group) => (
                    <Link
                      key={group.slug}
                      to={`/language-groups/${group.slug}`}
                      className="rounded-2xl border border-base-300 bg-base-200/35 p-3 transition hover:bg-base-200"
                    >
                      <p className="truncate text-sm font-bold">{group.name}</p>
                      <p className="mt-1 text-xs text-base-content/50">
                        {group.memberCount || 0} members - {group.postCount || 0} posts
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {visibleUsers.map((user) => (
                <UserFollowCard
                  key={user._id}
                  user={user}
                  onFollow={followMutation}
                  onUnfollow={unfollowMutation}
                  isBusy={busyUserId === user._id}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
