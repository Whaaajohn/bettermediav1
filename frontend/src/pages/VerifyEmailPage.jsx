import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  LoaderIcon,
  LockKeyholeIcon,
  MailCheckIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthFooter, AuthHeader } from "../components/AuthChrome.jsx";
import useAuthUser from "../hooks/useAuthUser";
import { logout, sendVerificationCode, verifyEmailCode } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const VERIFICATION_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

function FeatureRow({ icon, title, description }) {
  return (
    <div className="group flex gap-3 rounded-[1.35rem] border border-base-300/80 bg-base-100/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-base-content/15 hover:shadow-md">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-base-200 text-base-content/65 transition group-hover:bg-primary/10 group-hover:text-primary">
        {createElement(icon, { className: "size-5" })}
      </div>

      <div className="min-w-0">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-base-content/55">
          {description}
        </p>
      </div>
    </div>
  );
}

function VerifyPreview() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="absolute -right-20 -top-20 size-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 size-52 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheckIcon className="size-6" />
            </div>

            <div>
              <p className="font-semibold tracking-tight">Account verification</p>
              <p className="text-sm text-base-content/50">
                Secure your account and unlock the full app.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
            Required
          </div>
        </div>

        <div className="mt-7 space-y-2">
          {[
            ["Step 1", "Send a code to your account email."],
            ["Step 2", "Enter the 6-digit verification code."],
            ["Step 3", "Unlock posting, messaging, follows, reports, and calls."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl bg-base-200/80 p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm text-base-content/55">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheckIcon className="size-4 text-success" />
            Safer account changes
          </div>

          <p className="mt-2 text-sm leading-6 text-base-content/55">
            Pending email changes do not replace your current email until the
            code is verified.
          </p>
        </div>
      </div>
    </div>
  );
}

function RefreshButton() {
  return (
    <button
      type="button"
      className="hidden h-10 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 text-sm font-medium text-base-content/65 shadow-sm transition hover:bg-base-200 hover:text-base-content md:inline-flex"
      onClick={() => window.location.reload()}
    >
      <RefreshCwIcon className="size-4" />
      Refresh
    </button>
  );
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser, isLoading } = useAuthUser();

  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const refreshAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  const emailToVerify = useMemo(() => {
    return authUser?.pendingEmail || authUser?.email || "";
  }, [authUser?.pendingEmail, authUser?.email]);

  const alreadyVerified = Boolean(authUser?.emailVerified && !authUser?.pendingEmail);
  const codeReady = code.length === VERIFICATION_CODE_LENGTH;

  const { mutate: sendCode, isPending: sending } = useMutation({
    mutationFn: sendVerificationCode,
    onSuccess: (data) => {
      toast.success(data?.message || "Verification code sent");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      refreshAuth();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not send verification code"));
    },
  });

  const { mutate: verifyCode, isPending: verifying } = useMutation({
    mutationFn: verifyEmailCode,
    onSuccess: (data) => {
      toast.success(data?.message || "Email verified");
      setCode("");
      refreshAuth();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not verify code"));
    },
  });

  const { mutate: logoutMutation, isPending: loggingOut } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/login");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not log out"));
    },
  });

  const isBusy = sending || verifying || loggingOut;

  const handleSendCode = () => {
    if (isBusy || resendCooldown > 0 || alreadyVerified) return;
    sendCode();
  };

  const handleVerify = (event) => {
    event.preventDefault();

    if (!codeReady || isBusy || alreadyVerified) return;

    verifyCode(code);
  };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-base-100 text-base-content">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg" />
          <p className="text-sm text-base-content/50">Checking your account...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-base-100 text-base-content">
        <AuthHeader
          actionTo="/login"
          actionLabel="Sign in"
          trailing={<RefreshButton />}
        />

        <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center px-4 py-8">
          <section className="w-full max-w-md rounded-[1.75rem] border border-base-300 bg-base-100 p-6 text-center shadow-sm">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-base-200 text-base-content/60">
              <LockKeyholeIcon className="size-6" />
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Sign in required
            </h1>

            <p className="mt-2 text-sm leading-6 text-base-content/55">
              You need to sign in before verifying your email.
            </p>

            <Link to="/login" className="btn btn-primary mt-5 h-11 rounded-2xl">
              Go to sign in
              <ArrowRightIcon className="size-4" />
            </Link>
          </section>
        </main>

        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <AuthHeader
        actionTo="/login"
        actionLabel="Sign in"
        trailing={<RefreshButton />}
      />

      <main className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">
        <section className="flex items-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium text-base-content/60">
                <SparklesIcon className="size-3.5" />
                Email verification
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {alreadyVerified ? "Email verified" : "Verify your email"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-base-content/60">
                {alreadyVerified
                  ? "Your account email is verified. You can now continue into the full app."
                  : "Enter the 6-digit code sent to the email connected to your account."}
              </p>
            </div>

            <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-base-200 text-base-content/65">
                  {alreadyVerified ? (
                    <CheckCircle2Icon className="size-5 text-success" />
                  ) : (
                    <MailCheckIcon className="size-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="font-semibold tracking-tight">
                    {alreadyVerified ? "Verified account" : "Confirm your email"}
                  </h2>

                  <p className="truncate text-sm text-base-content/50">
                    {emailToVerify || "No email found"}
                  </p>
                </div>
              </div>

              {authUser?.pendingEmail && (
                <div className="mb-4 rounded-2xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
                  Verifying this will replace{" "}
                  <span className="font-semibold">{authUser.email}</span> with{" "}
                  <span className="font-semibold">{authUser.pendingEmail}</span>.
                </div>
              )}

              <div className="mb-5 rounded-2xl border border-base-300 bg-base-200/45 p-4">
                <p className="truncate font-semibold">{emailToVerify}</p>

                <p className="mt-2 text-sm leading-6 text-base-content/60">
                  Verified accounts can post, message, follow, report, comment,
                  repost, and use the full feed.
                </p>
              </div>

              {alreadyVerified ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-success/25 bg-success/10 p-4 text-success">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="size-5 shrink-0" />
                      <p className="font-medium">Your email is verified.</p>
                    </div>
                  </div>

                  <Link to="/" className="btn btn-primary h-12 w-full rounded-2xl">
                    Continue to app
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <form onSubmit={handleVerify} className="space-y-4">
                    <label className="form-control">
                      <span className="mb-1 text-sm font-medium text-base-content/75">
                        Verification code
                      </span>

                      <input
                        className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-center text-2xl tracking-[0.35em] focus:outline-none"
                        value={code}
                        onChange={(event) =>
                          setCode(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, VERIFICATION_CODE_LENGTH)
                          )
                        }
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={VERIFICATION_CODE_LENGTH}
                        disabled={isBusy}
                        autoFocus
                        required
                      />
                    </label>

                    <button
                      className="btn btn-primary h-12 w-full rounded-2xl font-semibold"
                      disabled={verifying || !codeReady || isBusy}
                      type="submit"
                    >
                      {verifying ? (
                        <>
                          <span className="loading loading-spinner loading-xs" />
                          Verifying
                        </>
                      ) : (
                        <>
                          <ShieldCheckIcon className="size-4" />
                          Verify email
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="btn btn-outline h-11 rounded-2xl"
                      onClick={handleSendCode}
                      disabled={sending || resendCooldown > 0 || isBusy}
                    >
                      {sending ? (
                        <>
                          <LoaderIcon className="size-4 animate-spin" />
                          Sending
                        </>
                      ) : resendCooldown > 0 ? (
                        `Again in ${resendCooldown}s`
                      ) : (
                        "Send code"
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost h-11 rounded-2xl"
                      onClick={() => logoutMutation()}
                      disabled={loggingOut}
                    >
                      {loggingOut ? (
                        <>
                          <LoaderIcon className="size-4 animate-spin" />
                          Logging out
                        </>
                      ) : (
                        "Use another account"
                      )}
                    </button>
                  </div>

                  <Link to="/login" className="btn btn-ghost mt-3 h-11 w-full rounded-2xl">
                    <ArrowLeftIcon className="size-4" />
                    Back to sign in
                  </Link>
                </>
              )}
            </section>

            <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-200/45 p-4 text-sm text-base-content/60">
              <div className="flex gap-3">
                <LockKeyholeIcon className="mt-0.5 size-5 shrink-0 text-base-content/45" />
                <p>
                  Never share your verification code. BetterMedia should only ask
                  for it on this verification page.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden items-center lg:flex">
          <div className="w-full space-y-5">
            <VerifyPreview />

            <div id="about" className="grid gap-3">
              <FeatureRow
                icon={ShieldCheckIcon}
                title="Unlock full features"
                description="Verified users can post, message, follow, comment, repost, and report safely."
              />

              <FeatureRow
                icon={LockKeyholeIcon}
                title="Protect account changes"
                description="Pending email changes do not replace your current email until the code is verified."
              />

              <FeatureRow
                icon={UserRoundIcon}
                title="Use another account"
                description="Logged into the wrong account? Sign out and verify the correct one."
              />

              <FeatureRow
                icon={BookOpenIcon}
                title="Docs-ready support"
                description="Add verification help, email setup, and account troubleshooting pages later."
              />
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
}