import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Globe2Icon,
  LanguagesIcon,
  LoaderIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import InterestPicker from "../components/InterestPicker.jsx";
import { LANGUAGES } from "../constants";
import useAuthUser from "../hooks/useAuthUser";
import { getInterests, saveMyInterests } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const MIN_RECOMMENDED_INTERESTS = 3;
const MAX_INTERESTS = 8;

function skipKey(userId) {
  return `bettermedia-skip-interests:${userId}`;
}

function StepCard({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-base-200 text-base-content/60">
          {createElement(Icon, { className: "size-5" })}
        </div>

        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-5 text-base-content/50">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingInterestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [selected, setSelected] = useState([]);
  const [nativeLanguage, setNativeLanguage] = useState("english");
  const [learningLanguage, setLearningLanguage] = useState("spanish");
  const [hydratedUserId, setHydratedUserId] = useState(null);

  useEffect(() => {
    if (!authUser?._id || hydratedUserId === authUser._id) return;

    setHydratedUserId(authUser._id);

    setSelected(
      authUser.interests ||
        authUser.algorithmProfile?.selectedInterests ||
        []
    );

    setNativeLanguage(authUser.nativeLanguage || "english");
    setLearningLanguage(authUser.learningLanguage || "spanish");
  }, [authUser, hydratedUserId]);

  const { data, isLoading } = useQuery({
    queryKey: ["interests"],
    queryFn: getInterests,
    staleTime: 300_000,
    retry: 1,
  });

  const interests = useMemo(() => {
    return Array.isArray(data?.interests) ? data.interests : [];
  }, [data?.interests]);

  const selectedCount = selected.length;
  const hasRecommendedMinimum = selectedCount >= MIN_RECOMMENDED_INTERESTS;
  const sameLanguage = nativeLanguage === learningLanguage;

  const saveMutation = useMutation({
    mutationFn: saveMyInterests,
    onSuccess: (data) => {
      if (authUser?._id) {
        localStorage.removeItem(skipKey(authUser._id));
      }

      queryClient.setQueryData(["authUser"], (current) =>
        current ? { ...current, ...(data?.user || {}) } : current
      );

      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });

      toast.success("Feed preferences saved");
      navigate("/");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save interests")),
  });

  const skip = () => {
    if (authUser?._id) {
      localStorage.setItem(skipKey(authUser._id), "true");
    }

    navigate("/");
  };

  const save = () => {
    if (!hasRecommendedMinimum) {
      toast.error(`Pick at least ${MIN_RECOMMENDED_INTERESTS} interests or skip for now.`);
      return;
    }

    saveMutation.mutate({
      interests: selected,
      nativeLanguage,
      learningLanguage,
    });
  };

  if (!authUser) {
    return (
      <div className="grid min-h-screen place-items-center bg-base-100 text-base-content">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg" />
          <p className="text-sm text-base-content/50">Loading your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 px-4 py-6 text-base-content sm:px-6 lg:px-8">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
        <section className="hidden lg:block">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
              <div className="absolute -right-24 -top-24 size-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-56 rounded-full bg-secondary/10 blur-3xl" />

              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
                  <SparklesIcon className="size-3.5" />
                  Better recommendations
                </div>

                <h1 className="text-4xl font-bold tracking-tight">
                  Build your feed around what you actually care about.
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-base-content/55">
                  Your interests help BetterMedia tune posts, hashtag pages,
                  language matches, and people suggestions without making the
                  app feel random.
                </p>

                <div className="mt-6 grid gap-3">
                  <StepCard
                    icon={TargetIcon}
                    title="For You feed"
                    description="Interests help rank posts and creators that match your taste."
                  />

                  <StepCard
                    icon={Globe2Icon}
                    title="Language matching"
                    description="Your native and learning languages improve discovery."
                  />

                  <StepCard
                    icon={CheckCircle2Icon}
                    title="You stay in control"
                    description="You can change these later in settings anytime."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
              <SparklesIcon className="size-3.5" />
              Tune your For You feed
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Pick what you want to see
            </h1>

            <p className="mt-2 text-sm leading-6 text-base-content/55">
              Choose at least {MIN_RECOMMENDED_INTERESTS} interests. You can
              change this later from settings.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.35rem] border border-base-300 bg-base-200/35 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderIcon className="size-6 animate-spin text-base-content/45" />
                </div>
              ) : (
                <InterestPicker
                  options={interests}
                  value={selected}
                  onChange={setSelected}
                  maxSelected={MAX_INTERESTS}
                  minSelected={0}
                  showSearch
                  showCounter
                  title="Interests"
                  description="Pick topics you want your feed to understand first."
                />
              )}

              {!hasRecommendedMinimum && selectedCount > 0 && (
                <p className="mt-3 text-xs text-warning">
                  Pick {MIN_RECOMMENDED_INTERESTS - selectedCount} more for a
                  better starting feed.
                </p>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-base-300 bg-base-200/35 p-4">
              <div className="mb-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <LanguagesIcon className="size-4 text-base-content/55" />
                  Languages
                </h2>

                <p className="mt-1 text-sm leading-5 text-base-content/50">
                  This helps with language feeds, people suggestions, and chat discovery.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm font-medium text-base-content/70">
                    Native language
                  </span>

                  <select
                    className="select select-bordered h-11 w-full rounded-2xl bg-base-100"
                    value={nativeLanguage}
                    onChange={(event) => setNativeLanguage(event.target.value)}
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language} value={language.toLowerCase()}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium text-base-content/70">
                    Learning language
                  </span>

                  <select
                    className="select select-bordered h-11 w-full rounded-2xl bg-base-100"
                    value={learningLanguage}
                    onChange={(event) => setLearningLanguage(event.target.value)}
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language} value={language.toLowerCase()}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {sameLanguage && (
                <p className="mt-3 text-xs text-base-content/45">
                  You selected the same language for both. That is allowed, but
                  choosing a different learning language may improve suggestions.
                </p>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="btn btn-ghost h-11 rounded-2xl"
              onClick={skip}
              disabled={saveMutation.isPending}
            >
              Skip for now
            </button>

            <button
              type="button"
              className="btn btn-primary h-11 rounded-2xl px-6"
              onClick={save}
              disabled={saveMutation.isPending || !hasRecommendedMinimum}
            >
              {saveMutation.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <ArrowRightIcon className="size-4" />
              )}
              Continue
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
