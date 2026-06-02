import { createElement, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  ShipWheelIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";

import { AuthFooter, AuthHeader } from "../components/AuthChrome.jsx";
import useLogin from "../hooks/useLogin";
import { verifyLoginCode } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

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

function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="absolute -right-20 -top-20 size-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 size-52 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <ShipWheelIcon className="size-6" />
            </div>

            <div>
              <p className="font-semibold tracking-tight">BetterMedia</p>
              <p className="text-sm text-base-content/50">
                Local-first social platform
              </p>
            </div>
          </div>

          <div className="rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
            Secure
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-2">
          {[
            ["Feed", "For You"],
            ["Chat", "DMs"],
            ["Calls", "Live"],
          ].map(([title, subtitle]) => (
            <div key={title} className="rounded-2xl bg-base-200/80 p-3 text-center">
              <p className="text-lg font-bold tracking-tight">{title}</p>
              <p className="mt-0.5 text-xs text-base-content/45">{subtitle}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2Icon className="size-4 text-success" />
            Production-ready foundation
          </div>

          <p className="mt-2 text-sm leading-6 text-base-content/55">
            Auth, privacy, reports, posts, chat, calls, and admin tools all in
            one clean system.
          </p>
        </div>
      </div>
    </div>
  );
}

const LoginPage = () => {
  const queryClient = useQueryClient();
  const [loginData, setLoginData] = useState({
    login: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [loginCode, setLoginCode] = useState("");

  const { isPending, error, loginMutation } = useLogin({
    onRequiresEmailCode: (data) => {
      setChallenge(data);
      setLoginCode("");
    },
  });
  const verifyCodeMutation = useMutation({
    mutationFn: verifyLoginCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  const canSubmit = useMemo(() => {
    return loginData.login.trim().length > 0 && loginData.password.length > 0;
  }, [loginData.login, loginData.password]);

  const handleLogin = (event) => {
    event.preventDefault();

    if (!canSubmit || isPending) return;

    loginMutation({
      login: loginData.login.trim(),
      password: loginData.password,
    });
  };

  const handleVerifyCode = (event) => {
    event.preventDefault();
    if (!challenge?.challengeId || loginCode.length !== 6 || verifyCodeMutation.isPending) return;
    verifyCodeMutation.mutate({
      challengeId: challenge.challengeId,
      code: loginCode,
    });
  };

  const handleUseAnotherAccount = () => {
    setChallenge(null);
    setLoginCode("");
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <AuthHeader
        actionTo="/signup"
        actionLabel="Create account"
        mobileLabel="Sign up"
      />

      <main className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">
        <section className="flex items-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium text-base-content/60">
                <SparklesIcon className="size-3.5" />
                Welcome back
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sign in to BetterMedia
              </h1>

              <p className="mt-3 text-sm leading-6 text-base-content/60">
                Continue to your feed, messages, calls, notifications, and
                community tools.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
              {(error || verifyCodeMutation.error) && (
                <div className="mb-4 rounded-2xl border border-error/25 bg-error/10 p-3 text-sm text-error">
                  {getApiErrorMessage(error || verifyCodeMutation.error, "Could not sign in")}
                </div>
              )}

              {challenge ? (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <div className="flex gap-3">
                      <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">Check your email</p>
                        <p className="mt-1 text-sm leading-5 text-base-content/60">
                          {challenge.message || "Enter the 6-digit login code sent to your email."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="form-control">
                    <span className="mb-1 text-sm font-medium text-base-content/75">
                      Login code
                    </span>
                    <input
                      className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-center text-lg tracking-[0.35em] focus:outline-none"
                      value={loginCode}
                      onChange={(event) =>
                        setLoginCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                    />
                  </label>

                  <button
                    type="submit"
                    className="btn btn-primary h-12 w-full rounded-2xl font-semibold"
                    disabled={verifyCodeMutation.isPending || loginCode.length !== 6}
                  >
                    {verifyCodeMutation.isPending ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Checking code
                      </>
                    ) : (
                      <>
                        Confirm login
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </button>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="btn h-11 rounded-2xl border-0 bg-base-200 hover:bg-base-300"
                      disabled={isPending}
                      onClick={() =>
                        loginMutation({
                          login: loginData.login.trim(),
                          password: loginData.password,
                        })
                      }
                    >
                      Resend code
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost h-11 rounded-2xl"
                      onClick={handleUseAnotherAccount}
                    >
                      Use another account
                    </button>
                  </div>
                </form>
              ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="form-control">
                  <span className="mb-1 text-sm font-medium text-base-content/75">
                    Email or username
                  </span>

                  <input
                    type="text"
                    placeholder="you@email.com or username"
                    className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-[0.95rem] focus:outline-none"
                    value={loginData.login}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    disabled={isPending}
                    autoFocus
                    onChange={(event) =>
                      setLoginData((current) => ({
                        ...current,
                        login: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="form-control">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-base-content/75">
                      Password
                    </span>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      className="input input-bordered h-12 w-full rounded-2xl bg-base-100 pr-12 text-[0.95rem] focus:outline-none"
                      value={loginData.password}
                      autoComplete="current-password"
                      disabled={isPending}
                      onChange={(event) =>
                        setLoginData((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={isPending}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="size-5" />
                      ) : (
                        <EyeIcon className="size-5" />
                      )}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  className="btn btn-primary h-12 w-full rounded-2xl font-semibold"
                  disabled={isPending || !canSubmit}
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Signing in
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRightIcon className="size-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-base-content/60">
                  Do not have an account?{" "}
                  <Link
                    to="/signup"
                    className="font-semibold text-primary hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              </form>
              )}
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-200/45 p-4 text-sm text-base-content/60">
              <div className="flex gap-3">
                <LockKeyholeIcon className="mt-0.5 size-5 shrink-0 text-base-content/45" />
                <p>
                  Keep your login private. BetterMedia will never ask for your
                  password outside this sign-in page.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden items-center lg:flex">
          <div className="w-full space-y-5">
            <ProductPreview />

            <div id="about" className="grid gap-3">
              <FeatureRow
                icon={UsersRoundIcon}
                title="Real social features"
                description="Follow people, manage privacy, post updates, and keep profiles clean."
              />

              <FeatureRow
                icon={MessageCircleIcon}
                title="Messages and calls"
                description="Jump back into chats, voice messages, video calls, and notifications."
              />

              <FeatureRow
                icon={ShieldCheckIcon}
                title="Built-in safety"
                description="Blocking, reports, private accounts, bans, appeals, and moderation tools."
              />

              <FeatureRow
                icon={BookOpenIcon}
                title="Docs-ready platform"
                description="Support pages, setup guides, community rules, and developer documentation."
              />
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
};

export default LoginPage;
