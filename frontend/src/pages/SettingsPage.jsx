import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSignIcon,
  BugIcon,
  CameraIcon,
  CheckCircle2Icon,
  LanguagesIcon,
  LoaderIcon,
  LockIcon,
  MailCheckIcon,
  MessageCircleIcon,
  PhoneIcon,
  RotateCcwIcon,
  SaveIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import DeviceSessionList from "../components/DeviceSessionList.jsx";
import InterestPicker from "../components/InterestPicker.jsx";
import { LANGUAGES } from "../constants";
import useAuthUser from "../hooks/useAuthUser";
import {
  createReport,
  getAuthSessions,
  getInterests,
  getLanguageGroups,
  logoutOtherSessions,
  revokeAuthSession,
  saveMyInterests,
  sendVerificationCode,
  setEmailCodeLogin,
  trustAuthSession,
  updateMySettings,
  verifyEmailCode,
} from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { fileToDataUrl, makeLocalAvatar } from "../lib/utils";

const defaultProfileState = {
  fullName: "",
  bio: "",
  location: "",
  nativeLanguage: "english",
  learningLanguage: "spanish",
  profilePic: "",
  isPrivate: false,
  allowMessagesFrom: "everyone",
  showFollowers: true,
  showFollowing: true,
  showOnlineStatus: true,
  readReceiptsEnabled: true,
  cameraEnabled: true,
  micEnabled: true,
};

const AUTOSAVE_DELAY_MS = 850;

function normalizeProfile(profile) {
  return {
    fullName: profile.fullName.trim(),
    bio: profile.bio.trim(),
    location: profile.location.trim(),
    nativeLanguage: profile.nativeLanguage || "english",
    learningLanguage: profile.learningLanguage || "spanish",
    profilePic: profile.profilePic || "",
    isPrivate: Boolean(profile.isPrivate),
    allowMessagesFrom: profile.allowMessagesFrom || "everyone",
    showFollowers: Boolean(profile.showFollowers),
    showFollowing: Boolean(profile.showFollowing),
    showOnlineStatus: Boolean(profile.showOnlineStatus),
    readReceiptsEnabled: Boolean(profile.readReceiptsEnabled),
    cameraEnabled: Boolean(profile.cameraEnabled),
    micEnabled: Boolean(profile.micEnabled),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidUsername(username) {
  return /^[a-z0-9._]{3,24}$/.test(String(username || "").trim());
}

function SectionCard({ icon: Icon, title, description, children, rightSlot }) {
  return (
    <section className="rounded-[1.45rem] border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-base-200 text-base-content/60">
            {createElement(Icon, { className: "size-5" })}
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-5 text-base-content/50">
                {description}
              </p>
            )}
          </div>
        </div>

        {rightSlot}
      </div>

      {children}
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/45 p-4 text-left transition hover:bg-base-200/70"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {description && (
          <p className="mt-1 text-sm leading-5 text-base-content/50">
            {description}
          </p>
        )}
      </div>

      <span
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-base-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 size-5 rounded-full bg-base-100 shadow-sm transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function AutoSaveStatus({ state }) {
  const labels = {
    saved: "Saved automatically",
    saving: "Saving...",
    pending: "Waiting to save",
    error: "Could not auto-save",
    invalid: "Add a valid name to auto-save",
    idle: "Auto-save enabled",
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/55">
      {state === "saving" ? (
        <LoaderIcon className="size-3.5 animate-spin" />
      ) : state === "error" || state === "invalid" ? (
        <span className="size-2 rounded-full bg-error" />
      ) : (
        <span className="size-2 rounded-full bg-success" />
      )}
      {labels[state] || labels.idle}
    </div>
  );
}

function FieldError({ children }) {
  if (!children) return null;

  return <p className="mt-1 text-xs text-error">{children}</p>;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const hydratedUserIdRef = useRef(null);
  const lastAutoSaveJsonRef = useRef("");

  const [profileState, setProfileState] = useState(defaultProfileState);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [usernameDirty, setUsernameDirty] = useState(false);
  const [emailDirty, setEmailDirty] = useState(false);

  const [emailCode, setEmailCode] = useState("");
  const [bugText, setBugText] = useState("");
  const [autoSaveState, setAutoSaveState] = useState("idle");
  const [busySessionId, setBusySessionId] = useState(null);
  const [interestDraft, setInterestDraft] = useState([]);

  useEffect(() => {
    if (!authUser?._id) return;

    const savedProfile = {
      fullName: authUser.fullName || "",
      bio: authUser.bio || "",
      location: authUser.location || "",
      nativeLanguage: authUser.nativeLanguage || "english",
      learningLanguage: authUser.learningLanguage || "spanish",
      profilePic:
        authUser.profilePic ||
        makeLocalAvatar(authUser.fullName || authUser.username || "User"),
      isPrivate: Boolean(authUser.isPrivate),
      allowMessagesFrom: authUser.allowMessagesFrom || "everyone",
      showFollowers: authUser.showFollowers !== false,
      showFollowing: authUser.showFollowing !== false,
      showOnlineStatus: authUser.showOnlineStatus !== false,
      readReceiptsEnabled: authUser.readReceiptsEnabled !== false,
      cameraEnabled: authUser.cameraEnabled !== false,
      micEnabled: authUser.micEnabled !== false,
    };

    const userChanged = hydratedUserIdRef.current !== authUser._id;

    if (userChanged) {
      hydratedUserIdRef.current = authUser._id;

      setProfileState(savedProfile);
      setUsernameDraft(authUser.username || "");
      setEmailDraft(authUser.pendingEmail || authUser.email || "");
      setUsernameDirty(false);
      setEmailDirty(false);
      setEmailCode("");
      setAutoSaveState("saved");
      setInterestDraft(authUser.interests || authUser.algorithmProfile?.selectedInterests || []);

      lastAutoSaveJsonRef.current = JSON.stringify(normalizeProfile(savedProfile));
      return;
    }

    if (!usernameDirty) setUsernameDraft(authUser.username || "");
    if (!emailDirty) setEmailDraft(authUser.pendingEmail || authUser.email || "");
  }, [
    authUser?._id,
    authUser?.username,
    authUser?.email,
    authUser?.pendingEmail,
    usernameDirty,
    emailDirty,
  ]);

  const savedUsername = authUser?.username || "";
  const savedEmail = authUser?.pendingEmail || authUser?.email || "";
  const currentEmail = authUser?.email || "";

  const normalizedProfile = useMemo(
    () => normalizeProfile(profileState),
    [profileState]
  );

  const autoSaveJson = useMemo(
    () => JSON.stringify(normalizedProfile),
    [normalizedProfile]
  );

  const typedUsername = usernameDraft.trim().toLowerCase();
  const typedEmail = emailDraft.trim().toLowerCase();

  const usernameChanged = typedUsername && typedUsername !== savedUsername;
  const emailChanged = typedEmail && typedEmail !== savedEmail.toLowerCase();

  const usernameValid = isValidUsername(typedUsername);
  const emailValid = isValidEmail(typedEmail);
  const nameValid = normalizedProfile.fullName.length >= 2;

  const hasPendingEmail = Boolean(authUser?.pendingEmail);
  const isEmailVerified =
    Boolean(authUser?.emailVerified) && !hasPendingEmail && !emailChanged;

  const profileCompletion = useMemo(() => {
    const checks = [
      normalizedProfile.fullName,
      typedUsername,
      typedEmail,
      normalizedProfile.bio,
      normalizedProfile.location,
      normalizedProfile.profilePic,
      normalizedProfile.nativeLanguage,
      normalizedProfile.learningLanguage,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [normalizedProfile, typedUsername, typedEmail]);

  const patchAuthUser = (patch) => {
    queryClient.setQueryData(["authUser"], (current) =>
      current ? { ...current, ...patch } : current
    );
  };

  const buildPayload = ({ username = savedUsername, email = savedEmail } = {}) => {
    return {
      ...normalizedProfile,
      username: String(username || "").trim().toLowerCase(),
      email: String(email || "").trim().toLowerCase(),
    };
  };

  const updateProfileField = (field, value) => {
    setProfileState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const { mutate: autoSaveSettings } = useMutation({
    mutationFn: ({ payload }) => updateMySettings(payload),
    onSuccess: (_, variables) => {
      lastAutoSaveJsonRef.current = variables.safeJson;
      patchAuthUser(variables.patch);
      queryClient.invalidateQueries({ queryKey: ["languageGroups"] });
      setAutoSaveState("saved");
    },
    onError: () => {
      setAutoSaveState("error");
    },
  });

  const { mutate: saveIdentity, isPending: savingIdentity } = useMutation({
    mutationFn: ({ payload }) => updateMySettings(payload),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save changes")),
  });

  const { mutate: sendEmailCode, isPending: sendingEmailCode } = useMutation({
    mutationFn: sendVerificationCode,
    onSuccess: (data) => {
      toast.success(data?.message || "Verification code sent");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not send verification code")),
  });

  const { mutate: verifyNewEmail, isPending: verifyingEmail } = useMutation({
    mutationFn: verifyEmailCode,
    onSuccess: (data) => {
      setEmailCode("");
      setEmailDirty(false);
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success(data?.message || "Email verified");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not verify email")),
  });

  const {
    data: sessionData,
    isLoading: loadingSessions,
  } = useQuery({
    queryKey: ["authSessions"],
    queryFn: getAuthSessions,
    staleTime: 30_000,
  });

  const { data: interestData } = useQuery({
    queryKey: ["interests"],
    queryFn: getInterests,
    staleTime: 300_000,
  });

  const { data: languageGroups = [] } = useQuery({
    queryKey: ["languageGroups"],
    queryFn: getLanguageGroups,
    staleTime: 300_000,
  });

  const myLanguageGroups = useMemo(() => {
    return (Array.isArray(languageGroups) ? languageGroups : [])
      .filter((group) => group.isMember)
      .slice(0, 6);
  }, [languageGroups]);

  const saveSecuritySetting = useMutation({
    mutationFn: updateMySettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success(data?.message || "Security setting saved");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save security setting")),
  });

  const toggleEmailCodeMutation = useMutation({
    mutationFn: setEmailCodeLogin,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success(data?.message || "Login protection updated");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update login protection")),
  });

  const saveInterestsMutation = useMutation({
    mutationFn: saveMyInterests,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["languageGroups"] });
      queryClient.setQueryData(["authUser"], (current) =>
        current ? { ...current, ...(data?.user || {}) } : current
      );
      toast.success("Interests saved");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not save interests")),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: revokeAuthSession,
    onMutate: (sessionId) => setBusySessionId(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authSessions"] });
      toast.success("Device logged out");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not log out device")),
    onSettled: () => setBusySessionId(null),
  });

  const trustSessionMutation = useMutation({
    mutationFn: ({ sessionId, trusted }) => trustAuthSession(sessionId, trusted),
    onMutate: ({ sessionId }) => setBusySessionId(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authSessions"] });
      toast.success("Device trust updated");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update device")),
    onSettled: () => setBusySessionId(null),
  });

  const logoutOthersMutation = useMutation({
    mutationFn: logoutOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authSessions"] });
      toast.success("Other devices logged out");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not log out other devices")),
  });

  const { mutate: sendBugReport, isPending: reportingBug } = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      setBugText("");
      toast.success("Bug report sent to admin");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not send bug report")),
  });

  useEffect(() => {
    if (!authUser?._id) return;

    if (autoSaveJson === lastAutoSaveJsonRef.current) {
      if (autoSaveState !== "saved") setAutoSaveState("saved");
      return;
    }

    if (!nameValid) {
      setAutoSaveState("invalid");
      return;
    }

    setAutoSaveState("pending");

    const timer = window.setTimeout(() => {
      const safeEmail = savedEmail || currentEmail || typedEmail;
      const safeUsername = savedUsername || typedUsername;

      setAutoSaveState("saving");

      autoSaveSettings({
        payload: buildPayload({
          username: safeUsername,
          email: safeEmail,
        }),
        safeJson: autoSaveJson,
        patch: normalizedProfile,
      });
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    authUser?._id,
    autoSaveJson,
    autoSaveSettings,
    nameValid,
    normalizedProfile,
    savedEmail,
    currentEmail,
    typedEmail,
    savedUsername,
    typedUsername,
  ]);

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3MB");
      return;
    }

    try {
      const profilePic = await fileToDataUrl(file);
      updateProfileField("profilePic", profilePic);
    } catch {
      toast.error("Could not upload image");
    }
  };

  const handleGenerateAvatar = () => {
    updateProfileField(
      "profilePic",
      makeLocalAvatar(`${normalizedProfile.fullName || typedUsername || "User"} ${Date.now()}`)
    );
  };

  const handleSaveUsername = () => {
    if (!usernameValid) {
      toast.error("Username must be 3-24 characters using letters, numbers, dots, or underscores");
      return;
    }

    if (!usernameChanged) {
      setUsernameDirty(false);
      toast("Username is already saved");
      return;
    }

    saveIdentity(
      {
        payload: buildPayload({
          username: typedUsername,
          email: savedEmail || currentEmail,
        }),
      },
      {
        onSuccess: () => {
          setUsernameDirty(false);
          patchAuthUser({ username: typedUsername });
          queryClient.invalidateQueries({ queryKey: ["authUser"] });
          toast.success("Username updated");
        },
      }
    );
  };

  const handleSaveEmail = () => {
    if (!emailValid) {
      toast.error("Enter a valid email address");
      return;
    }

    if (!emailChanged && !hasPendingEmail && !isEmailVerified) {
      sendEmailCode();
      return;
    }

    if (!emailChanged && hasPendingEmail) {
      sendEmailCode();
      return;
    }

    saveIdentity(
      {
        payload: buildPayload({
          username: savedUsername || typedUsername,
          email: typedEmail,
        }),
      },
      {
        onSuccess: () => {
          setEmailDirty(false);
          queryClient.invalidateQueries({ queryKey: ["authUser"] });
          toast.success("Email saved as pending. Sending verification code...");
          sendEmailCode();
        },
      }
    );
  };

  const handleVerifyEmail = () => {
    if (emailCode.length !== 6) return;
    verifyNewEmail(emailCode);
  };

  const handleSaveInterests = () => {
    saveInterestsMutation.mutate({
      interests: interestDraft,
      nativeLanguage: profileState.nativeLanguage,
      learningLanguage: profileState.learningLanguage,
    });
  };

  const handleBugReport = () => {
    const details = bugText.trim();

    if (!details) return;

    sendBugReport({
      targetType: "bug",
      targetId: "settings",
      category: "bug",
      reason: "Bug report from Settings",
      details,
    });
  };

  if (!authUser) {
    return (
      <div className="grid min-h-full place-items-center p-6">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-base-100 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-[1.65rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-10 place-items-center rounded-2xl bg-base-200 text-base-content/60">
                  <UserIcon className="size-5" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Settings
                  </h1>
                  <p className="mt-1 text-sm text-base-content/50">
                    Profile, privacy, messages, calls, email, and support.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AutoSaveStatus state={autoSaveState} />

              <div className="rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/55">
                {profileCompletion}% complete
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5">
          <SectionCard
            icon={UserIcon}
            title="Profile"
            description="These changes save automatically."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="size-24 overflow-hidden rounded-full bg-base-300 ring-1 ring-base-300">
                <img
                  src={
                    normalizedProfile.profilePic ||
                    makeLocalAvatar(normalizedProfile.fullName || "User")
                  }
                  alt={normalizedProfile.fullName || "Profile picture"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-base-300 px-4 text-sm font-semibold transition hover:bg-base-200">
                    <CameraIcon className="size-4" />
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFile}
                    />
                  </label>

                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
                    onClick={handleGenerateAvatar}
                  >
                    <SparklesIcon className="size-4" />
                    Generate
                  </button>
                </div>

                <p className="text-xs leading-5 text-base-content/45">
                  Use a clear image under 3MB. Profile updates auto-save after a short pause.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-medium text-base-content/70">
                  Full name
                </span>
                <input
                  className="input input-bordered h-11 w-full rounded-2xl bg-base-100"
                  value={profileState.fullName}
                  onChange={(event) =>
                    updateProfileField("fullName", event.target.value)
                  }
                  placeholder="Your name"
                  maxLength={50}
                />
                <FieldError>
                  {!nameValid && profileState.fullName.length > 0
                    ? "Name must be at least 2 characters."
                    : ""}
                </FieldError>
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium text-base-content/70">
                  Location
                </span>
                <input
                  className="input input-bordered h-11 w-full rounded-2xl bg-base-100"
                  value={profileState.location}
                  onChange={(event) =>
                    updateProfileField("location", event.target.value)
                  }
                  placeholder="City or country"
                  maxLength={80}
                />
              </label>
            </div>

            <label className="mt-3 block">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-base-content/70">
                  Bio
                </span>
                <span className="text-xs text-base-content/40">
                  {profileState.bio.length}/160
                </span>
              </div>

              <textarea
                className="textarea textarea-bordered min-h-24 w-full rounded-2xl bg-base-100"
                value={profileState.bio}
                onChange={(event) => updateProfileField("bio", event.target.value)}
                placeholder="Tell people a little about you"
                maxLength={160}
              />
            </label>
          </SectionCard>

          <SectionCard
            icon={AtSignIcon}
            title="Username"
            description="Username changes require saving because they affect your profile link."
            rightSlot={
              usernameChanged ? (
                <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  Unsaved
                </span>
              ) : (
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Saved
                </span>
              )
            }
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="input input-bordered flex h-11 items-center gap-2 rounded-2xl bg-base-100">
                <span className="text-base-content/40">@</span>
                <input
                  className="grow"
                  value={usernameDraft}
                  onChange={(event) => {
                    setUsernameDirty(true);
                    setUsernameDraft(
                      event.target.value
                        .toLowerCase()
                        .replace(/\s/g, "")
                        .replace(/[^a-z0-9._]/g, "")
                        .slice(0, 24)
                    );
                  }}
                  placeholder="username"
                  minLength={3}
                  maxLength={24}
                />
              </label>

              {usernameDirty && (
                <button
                  type="button"
                  className="btn h-11 rounded-2xl border-0 bg-base-200 hover:bg-base-300"
                  onClick={() => {
                    setUsernameDraft(savedUsername);
                    setUsernameDirty(false);
                  }}
                >
                  <RotateCcwIcon className="size-4" />
                  Reset
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary h-11 rounded-2xl"
                disabled={!usernameChanged || !usernameValid || savingIdentity}
                onClick={handleSaveUsername}
              >
                {savingIdentity ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Save username
              </button>
            </div>

            <FieldError>
              {usernameDraft && !usernameValid
                ? "Use 3-24 characters: lowercase letters, numbers, dots, or underscores."
                : ""}
            </FieldError>
          </SectionCard>

          <SectionCard
            icon={MailCheckIcon}
            title="Email verification"
            description="Email changes require saving and a 6-digit verification code."
            rightSlot={
              isEmailVerified ? (
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Verified
                </span>
              ) : hasPendingEmail ? (
                <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  Pending
                </span>
              ) : (
                <span className="rounded-full bg-base-200 px-2.5 py-1 text-xs font-medium text-base-content/50">
                  Not verified
                </span>
              )
            }
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                className="input input-bordered h-11 w-full rounded-2xl bg-base-100"
                type="email"
                value={emailDraft}
                onChange={(event) => {
                  setEmailDirty(true);
                  setEmailDraft(event.target.value);
                }}
                placeholder="you@email.com"
                autoComplete="email"
              />

              {emailDirty && (
                <button
                  type="button"
                  className="btn h-11 rounded-2xl border-0 bg-base-200 hover:bg-base-300"
                  onClick={() => {
                    setEmailDraft(savedEmail || currentEmail);
                    setEmailDirty(false);
                  }}
                >
                  <RotateCcwIcon className="size-4" />
                  Reset
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary h-11 rounded-2xl"
                onClick={handleSaveEmail}
                disabled={
                  savingIdentity ||
                  sendingEmailCode ||
                  verifyingEmail ||
                  isEmailVerified ||
                  !emailValid
                }
              >
                {savingIdentity || sendingEmailCode ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <MailCheckIcon className="size-4" />
                )}
                {emailChanged
                  ? "Save email"
                  : hasPendingEmail
                    ? "Send code"
                    : isEmailVerified
                      ? "Verified"
                      : "Send code"}
              </button>
            </div>

            <FieldError>
              {emailDraft && !emailValid ? "Enter a valid email address." : ""}
            </FieldError>

            {isEmailVerified && (
              <div className="mt-3 rounded-2xl border border-success/25 bg-success/10 p-4 text-success">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-5 shrink-0" />
                  <p className="text-sm font-medium">Your email is verified.</p>
                </div>
              </div>
            )}

            {hasPendingEmail && (
              <div className="mt-3 rounded-2xl border border-warning/25 bg-warning/10 p-4">
                <p className="text-sm leading-6 text-warning">
                  Pending email change to{" "}
                  <span className="font-semibold">{authUser.pendingEmail}</span>.
                  Your current email stays active until this code is verified.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className="input input-bordered h-11 rounded-2xl bg-base-100 text-center tracking-[0.35em]"
                    value={emailCode}
                    onChange={(event) =>
                      setEmailCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                  />

                  <button
                    type="button"
                    className="btn btn-primary h-11 rounded-2xl"
                    disabled={verifyingEmail || emailCode.length !== 6}
                    onClick={handleVerifyEmail}
                  >
                    {verifyingEmail ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <ShieldCheckIcon className="size-4" />
                    )}
                    Verify
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={ShieldCheckIcon}
            title="Security"
            description="Login alerts, email-code login, and the devices currently signed in."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ToggleRow
                label="Login alerts by email"
                description="We will email you when a new device signs in."
                checked={authUser.security?.loginAlertsEnabled !== false}
                onChange={(value) =>
                  saveSecuritySetting.mutate({
                    security: { loginAlertsEnabled: value },
                  })
                }
              />

              <ToggleRow
                label="Require email code every login"
                description="After your password, enter a 6-digit code from email."
                checked={Boolean(authUser.security?.emailCodeOnLogin)}
                onChange={(value) => toggleEmailCodeMutation.mutate(value)}
              />
            </div>

            <div className="mt-4">
              <DeviceSessionList
                sessions={sessionData?.sessions || []}
                isLoading={loadingSessions}
                busySessionId={busySessionId}
                busyAll={logoutOthersMutation.isPending}
                onRevoke={(sessionId) => revokeSessionMutation.mutate(sessionId)}
                onTrust={(sessionId, trusted) =>
                  trustSessionMutation.mutate({ sessionId, trusted })
                }
                onLogoutOthers={() => logoutOthersMutation.mutate()}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={LanguagesIcon}
            title="Languages"
            description="These update automatically and help the feed recommend better people and posts."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-medium text-base-content/70">
                  Native language
                </span>
                <select
                  className="select select-bordered h-11 w-full rounded-2xl bg-base-100"
                  value={profileState.nativeLanguage}
                  onChange={(event) =>
                    updateProfileField("nativeLanguage", event.target.value)
                  }
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
                  value={profileState.learningLanguage}
                  onChange={(event) =>
                    updateProfileField("learningLanguage", event.target.value)
                  }
                >
                  {LANGUAGES.map((language) => (
                    <option key={language} value={language.toLowerCase()}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {myLanguageGroups.length > 0 && (
              <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                  Your language groups
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {myLanguageGroups.map((group) => (
                    <Link
                      key={group.slug}
                      to={`/language-groups/${group.slug}`}
                      className="rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-sm font-semibold text-base-content/65 transition hover:bg-base-200 hover:text-base-content"
                    >
                      {group.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={SparklesIcon}
            title="Feed interests"
            description="Tune your For You feed, hashtag suggestions, and people recommendations."
            rightSlot={
              <span className="rounded-full bg-base-200 px-2.5 py-1 text-xs font-medium text-base-content/50">
                {interestDraft.length} selected
              </span>
            }
          >
            <InterestPicker
              options={interestData?.interests || []}
              value={interestDraft}
              onChange={setInterestDraft}
              compact
            />

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-primary h-10 rounded-2xl"
                onClick={handleSaveInterests}
                disabled={saveInterestsMutation.isPending}
              >
                {saveInterestsMutation.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Save interests
              </button>
            </div>
          </SectionCard>

          <SectionCard
            icon={LockIcon}
            title="Privacy"
            description="Changes here save automatically."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ToggleRow
                label="Private account"
                description="New followers must request access first."
                checked={profileState.isPrivate}
                onChange={(value) => updateProfileField("isPrivate", value)}
              />

              <ToggleRow
                label="Show followers"
                description="Allow people to see your followers list."
                checked={profileState.showFollowers}
                onChange={(value) => updateProfileField("showFollowers", value)}
              />

              <ToggleRow
                label="Show following"
                description="Allow people to see who you follow."
                checked={profileState.showFollowing}
                onChange={(value) => updateProfileField("showFollowing", value)}
              />

              <ToggleRow
                label="Read receipts"
                description="Show when you have read chat messages."
                checked={profileState.readReceiptsEnabled}
                onChange={(value) =>
                  updateProfileField("readReceiptsEnabled", value)
                }
              />

              <ToggleRow
                label="Online status"
                description="Let people see when you're online, in a call, or last seen."
                checked={profileState.showOnlineStatus}
                onChange={(value) =>
                  updateProfileField("showOnlineStatus", value)
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={MessageCircleIcon}
            title="Messages"
            description="Choose who can start conversations with you. This saves automatically."
          >
            <select
              className="select select-bordered h-11 w-full rounded-2xl bg-base-100"
              value={profileState.allowMessagesFrom}
              onChange={(event) =>
                updateProfileField("allowMessagesFrom", event.target.value)
              }
            >
              <option value="everyone">Messages from everyone</option>
              <option value="followers">Messages from followers</option>
              <option value="following">Messages from people I follow</option>
              <option value="mutuals">Messages from mutuals</option>
              <option value="nobody">Messages from nobody</option>
            </select>
          </SectionCard>

          <SectionCard
            icon={PhoneIcon}
            title="Calls"
            description="Default camera and microphone behavior. These save automatically."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ToggleRow
                label="Camera on by default"
                description="Start calls with your camera enabled."
                checked={profileState.cameraEnabled}
                onChange={(value) => updateProfileField("cameraEnabled", value)}
              />

              <ToggleRow
                label="Microphone on by default"
                description="Start calls with your microphone enabled."
                checked={profileState.micEnabled}
                onChange={(value) => updateProfileField("micEnabled", value)}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={BugIcon}
            title="Report a bug"
            description="Send admins a quick report when something breaks."
          >
            <textarea
              className="textarea textarea-bordered min-h-28 w-full rounded-2xl bg-base-100"
              value={bugText}
              onChange={(event) => setBugText(event.target.value)}
              placeholder="Tell admin what broke, what you clicked, and what you expected to happen."
              maxLength={800}
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-base-content/45">{bugText.length}/800</p>

              <button
                type="button"
                className="btn h-10 rounded-2xl border-0 bg-base-200 hover:bg-base-300"
                disabled={reportingBug || !bugText.trim()}
                onClick={handleBugReport}
              >
                {reportingBug ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <BugIcon className="size-4" />
                )}
                Send bug report
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
