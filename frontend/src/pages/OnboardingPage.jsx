import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  Globe2Icon,
  LoaderIcon,
  LockKeyholeIcon,
  MessageCircleIcon,
  SaveIcon,
  ShuffleIcon,
  UserRoundIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { LANGUAGES } from "../constants";
import useAuthUser from "../hooks/useAuthUser";
import { completeOnboarding } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { fileToDataUrl, makeLocalAvatar } from "../lib/utils";

const defaultFormState = {
  fullName: "",
  username: "",
  bio: "",
  nativeLanguage: "english",
  learningLanguage: "spanish",
  location: "",
  profilePic: "",
  isPrivate: false,
  allowMessagesFrom: "followers",
  showFollowers: true,
  showFollowing: true,
  readReceiptsEnabled: true,
  cameraEnabled: true,
  micEnabled: true,
};

const messageOptions = [
  ["everyone", "Everyone"],
  ["followers", "Followers"],
  ["following", "People I follow"],
  ["mutuals", "Mutuals"],
  ["nobody", "Nobody"],
];

function cleanUsername(value) {
  return value
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/_{2,}/g, "_")
    .slice(0, 24);
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-1 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-base-content/50">{description}</span>
      </span>

      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="space-y-4 rounded-[1.6rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-base-200">
          {createElement(Icon, { className: "size-5 text-base-content/65" })}
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-base-content/55">{description}</p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function SegmentedChoice({ value, onChange, options }) {
  return (
    <div className="grid rounded-xl border border-base-300 bg-base-200/70 p-1 sm:grid-cols-5">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`h-9 rounded-lg text-xs font-medium transition ${
            value === optionValue
              ? "bg-base-100 text-base-content shadow-sm"
              : "text-base-content/55 hover:bg-base-100/50 hover:text-base-content"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState(defaultFormState);
  const [hydratedUserId, setHydratedUserId] = useState(null);

  useEffect(() => {
    if (!authUser?._id || hydratedUserId === authUser._id) return;

    setFormState({
      fullName: authUser.fullName || "",
      username: authUser.username || "",
      bio: authUser.bio || "",
      nativeLanguage: authUser.nativeLanguage || "english",
      learningLanguage: authUser.learningLanguage || "spanish",
      location: authUser.location || "",
      profilePic:
        authUser.profilePic ||
        makeLocalAvatar(authUser.fullName || authUser.username || "User"),
      isPrivate: Boolean(authUser.isPrivate),
      allowMessagesFrom: authUser.allowMessagesFrom || "followers",
      showFollowers: authUser.showFollowers !== false,
      showFollowing: authUser.showFollowing !== false,
      readReceiptsEnabled: authUser.readReceiptsEnabled !== false,
      cameraEnabled: authUser.cameraEnabled !== false,
      micEnabled: authUser.micEnabled !== false,
    });

    setHydratedUserId(authUser._id);
  }, [authUser, hydratedUserId]);

  const setField = (field, value) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validation = useMemo(() => {
    const fullName = formState.fullName.trim();
    const username = formState.username.trim();
    const bio = formState.bio.trim();

    return {
      nameOk: fullName.length >= 2,
      usernameOk: /^[a-z0-9._]{3,24}$/.test(username),
      bioOk: bio.length <= 160,
      languagesOk:
        Boolean(formState.nativeLanguage) &&
        Boolean(formState.learningLanguage),
      avatarOk: Boolean(formState.profilePic),
    };
  }, [formState]);

  const completion = useMemo(() => {
    const checks = [
      validation.nameOk,
      validation.usernameOk,
      validation.bioOk,
      validation.languagesOk,
      validation.avatarOk,
      Boolean(formState.location.trim()),
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [formState.location, validation]);

  const canSubmit =
    validation.nameOk &&
    validation.usernameOk &&
    validation.bioOk &&
    validation.languagesOk;

  const { mutate: saveOnboarding, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile is ready");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not save onboarding"));
    },
  });

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3MB");
      event.target.value = "";
      return;
    }

    try {
      const image = await fileToDataUrl(file);
      setField("profilePic", image);
    } catch {
      toast.error("Could not load that image");
    } finally {
      event.target.value = "";
    }
  };

  const buildPayload = () => ({
    ...formState,
    fullName: formState.fullName.trim(),
    username: cleanUsername(formState.username.trim()),
    bio: formState.bio.trim().slice(0, 160),
    location: formState.location.trim().slice(0, 80),
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Add a valid name, username, and languages first");
      return;
    }

    saveOnboarding(buildPayload());
  };

  const previewName = formState.fullName.trim() || "Your name";
  const previewUsername = formState.username.trim() || "username";
  const previewAvatar =
    formState.profilePic || makeLocalAvatar(previewName || previewUsername);

  return (
    <div className="min-h-screen bg-base-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-base-content/45">
              MEDIA setup
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Set up your account
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-base-content/55">
              Build your profile, choose your language feed, and set your privacy before you start.
            </p>
          </div>

          <div className="w-full sm:w-44">
            <div className="mb-1 flex items-center justify-between text-xs text-base-content/50">
              <span>Progress</span>
              <span>{completion}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-base-200">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </header>

        <form
          className="grid grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]"
          onSubmit={handleSubmit}
        >
          <aside className="h-fit rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm lg:sticky lg:top-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="size-32 overflow-hidden rounded-full bg-base-200 ring-1 ring-base-300">
                  <img
                    src={previewAvatar}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                </div>

                <label className="absolute bottom-1 right-1 grid size-9 cursor-pointer place-items-center rounded-full border border-base-300 bg-base-100 shadow-sm hover:bg-base-200">
                  <CameraIcon className="size-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </label>
              </div>

              <h2 className="mt-4 max-w-full truncate text-lg font-semibold">
                {previewName}
              </h2>

              <p className="max-w-full truncate text-sm text-base-content/50">
                @{previewUsername}
              </p>

              <button
                type="button"
                className="btn btn-ghost btn-sm mt-4 rounded-full"
                onClick={() =>
                  setField(
                    "profilePic",
                    makeLocalAvatar(`${previewName} ${Date.now()}`)
                  )
                }
              >
                <ShuffleIcon className="size-4" />
                Generate avatar
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-base-200/70 p-3 text-xs text-base-content/55">
              This appears in posts, comments, messages, calls, and notifications.
            </div>
          </aside>

          <main className="space-y-5">
            <Section
              icon={UserRoundIcon}
              title="Profile"
              description="Keep it simple. You can edit this later."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-1">Display name</span>
                  <input
                    className="input input-bordered w-full rounded-xl bg-base-100"
                    value={formState.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    autoComplete="name"
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-1">Username</span>
                  <label className="input input-bordered flex items-center gap-2 rounded-xl bg-base-100">
                    <span className="text-base-content/40">@</span>
                    <input
                      className="grow"
                      value={formState.username}
                      onChange={(e) =>
                        setField("username", cleanUsername(e.target.value))
                      }
                      placeholder="username"
                      maxLength={24}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </label>
                </label>
              </div>

              <label className="form-control">
                <div className="mb-1 flex items-center justify-between">
                  <span className="label-text">Bio</span>
                  <span className="text-xs text-base-content/40">
                    {formState.bio.length}/160
                  </span>
                </div>

                <textarea
                  className="textarea textarea-bordered min-h-24 w-full rounded-xl bg-base-100"
                  value={formState.bio}
                  onChange={(e) => setField("bio", e.target.value.slice(0, 160))}
                  placeholder="Tell people a little about you"
                  maxLength={160}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Location</span>
                <input
                  className="input input-bordered w-full rounded-xl bg-base-100"
                  value={formState.location}
                  onChange={(e) => setField("location", e.target.value)}
                  placeholder="City or country"
                  maxLength={80}
                />
              </label>
            </Section>

            <Section
              icon={Globe2Icon}
              title="Language feed"
              description="This helps shape your recommendations and profile."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-1">Native language</span>
                  <select
                    className="select select-bordered w-full rounded-xl bg-base-100"
                    value={formState.nativeLanguage}
                    onChange={(e) =>
                      setField("nativeLanguage", e.target.value)
                    }
                  >
                    {LANGUAGES.map((language) => (
                      <option
                        key={`native-${language}`}
                        value={language.toLowerCase()}
                      >
                        {language}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control">
                  <span className="label-text mb-1">Learning language</span>
                  <select
                    className="select select-bordered w-full rounded-xl bg-base-100"
                    value={formState.learningLanguage}
                    onChange={(e) =>
                      setField("learningLanguage", e.target.value)
                    }
                  >
                    {LANGUAGES.map((language) => (
                      <option
                        key={`learning-${language}`}
                        value={language.toLowerCase()}
                      >
                        {language}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Section>

            <Section
              icon={LockKeyholeIcon}
              title="Privacy"
              description="Choose what feels comfortable right now."
            >
              <div className="divide-y divide-base-300">
                <ToggleRow
                  label="Private account"
                  description="Approve new followers first."
                  checked={formState.isPrivate}
                  onChange={(value) => setField("isPrivate", value)}
                />

                <ToggleRow
                  label="Read receipts"
                  description="Show when you read messages."
                  checked={formState.readReceiptsEnabled}
                  onChange={(value) => setField("readReceiptsEnabled", value)}
                />

                <ToggleRow
                  label="Show followers"
                  description="Allow people to open your followers list."
                  checked={formState.showFollowers}
                  onChange={(value) => setField("showFollowers", value)}
                />

                <ToggleRow
                  label="Show following"
                  description="Allow people to open who you follow."
                  checked={formState.showFollowing}
                  onChange={(value) => setField("showFollowing", value)}
                />
              </div>
            </Section>

            <Section
              icon={MessageCircleIcon}
              title="Messages and calls"
              description="Set your default chat and call behavior."
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Who can message you?</p>
                  <SegmentedChoice
                    value={formState.allowMessagesFrom}
                    onChange={(value) => setField("allowMessagesFrom", value)}
                    options={messageOptions}
                  />
                </div>

                <div className="divide-y divide-base-300">
                  <ToggleRow
                    label="Camera on by default"
                    description="Start video calls with camera ready."
                    checked={formState.cameraEnabled}
                    onChange={(value) => setField("cameraEnabled", value)}
                  />

                  <ToggleRow
                    label="Mic on by default"
                    description="Start calls with microphone ready."
                    checked={formState.micEnabled}
                    onChange={(value) => setField("micEnabled", value)}
                  />
                </div>
              </div>
            </Section>

            <div className="sticky bottom-4 z-20">
              <div className="rounded-[1.4rem] border border-base-300 bg-base-100/90 p-3 shadow-xl backdrop-blur-xl">
                <button
                  className="btn btn-primary w-full rounded-xl"
                  disabled={isPending || !canSubmit}
                >
                  {isPending ? (
                    <LoaderIcon className="size-5 animate-spin" />
                  ) : canSubmit ? (
                    <SaveIcon className="size-5" />
                  ) : (
                    <ChevronRightIcon className="size-5" />
                  )}

                  {isPending ? "Saving..." : "Finish setup"}
                </button>

                {!canSubmit && (
                  <p className="mt-2 text-center text-xs text-base-content/45">
                    Add a valid display name, username, and languages.
                  </p>
                )}
              </div>
            </div>
          </main>
        </form>
      </div>
    </div>
  );
}
