import { createElement, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRightIcon,
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
import useSignUp from "../hooks/useSignUp.js";
import { getApiErrorMessage } from "../lib/errors.js";

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((item) => item.ok).length;
  const label = score <= 2 ? "Weak" : score <= 4 ? "Good" : "Strong";

  return (
    <div className="rounded-2xl border border-base-300 bg-base-200/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-base-content/55">
          Password strength
        </p>

        <p className="text-xs font-semibold text-base-content/70">{label}</p>
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1">
        {checks.map((item, index) => (
          <div
            key={item.label}
            className={[
              "h-1.5 rounded-full transition",
              index < score ? "bg-primary" : "bg-base-300",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {checks.map((item) => (
          <div
            key={item.label}
            className={[
              "flex items-center gap-1.5 text-xs",
              item.ok ? "text-base-content/70" : "text-base-content/35",
            ].join(" ")}
          >
            <CheckCircle2Icon
              className={[
                "size-3.5 shrink-0",
                item.ok ? "text-success" : "text-base-content/25",
              ].join(" ")}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
                Social, messaging, calls, and privacy.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
            Local-ready
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-2">
          {[
            ["Posts", "Share"],
            ["Chat", "DMs"],
            ["Calls", "Live"],
          ].map(([title, subtitle]) => (
            <div
              key={title}
              className="rounded-2xl bg-base-200/80 p-3 text-center"
            >
              <p className="text-lg font-bold tracking-tight">{title}</p>
              <p className="mt-0.5 text-xs text-base-content/45">{subtitle}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2Icon className="size-4 text-success" />
            Built for real communities
          </div>

          <p className="mt-2 text-sm leading-6 text-base-content/55">
            Privacy controls, reports, messaging, profiles, and admin tools are
            part of the foundation.
          </p>
        </div>
      </div>
    </div>
  );
}

const SignUpPage = () => {
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { isPending, error, signupMutation } = useSignUp();

  const normalizedEmail = signupData.email.trim().toLowerCase();

  const canSubmit = useMemo(() => {
    return (
      signupData.fullName.trim().length >= 2 &&
      normalizedEmail.length >= 5 &&
      normalizedEmail.includes("@") &&
      signupData.password.length >= 8 &&
      acceptedTerms
    );
  }, [signupData.fullName, signupData.password, normalizedEmail, acceptedTerms]);

  const handleSignup = (event) => {
    event.preventDefault();

    if (!canSubmit || isPending) return;

    signupMutation({
      fullName: signupData.fullName.trim(),
      email: normalizedEmail,
      password: signupData.password,
    });
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <AuthHeader actionTo="/login" actionLabel="Sign in" />

      <main className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-12">
        <section className="flex items-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium text-base-content/60">
                <SparklesIcon className="size-3.5" />
                Start your private social space
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Create your account
              </h1>

              <p className="mt-3 text-sm leading-6 text-base-content/60">
                Join BetterMedia to post, message, call, follow friends, and
                build a cleaner community experience.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
              {error && (
                <div className="mb-4 rounded-2xl border border-error/25 bg-error/10 p-3 text-sm text-error">
                  {getApiErrorMessage(error, "Could not create account")}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <label className="form-control">
                  <span className="mb-1 text-sm font-medium text-base-content/75">
                    Full name
                  </span>

                  <input
                    type="text"
                    placeholder="Your name"
                    className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-[0.95rem] focus:outline-none"
                    value={signupData.fullName}
                    autoComplete="name"
                    maxLength={50}
                    disabled={isPending}
                    autoFocus
                    onChange={(event) =>
                      setSignupData((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="form-control">
                  <span className="mb-1 text-sm font-medium text-base-content/75">
                    Email
                  </span>

                  <input
                    type="email"
                    placeholder="you@email.com"
                    className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-[0.95rem] focus:outline-none"
                    value={signupData.email}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    disabled={isPending}
                    onChange={(event) =>
                      setSignupData((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="form-control">
                  <span className="mb-1 text-sm font-medium text-base-content/75">
                    Password
                  </span>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="input input-bordered h-12 w-full rounded-2xl bg-base-100 pr-12 text-[0.95rem] focus:outline-none"
                      value={signupData.password}
                      autoComplete="new-password"
                      minLength={8}
                      disabled={isPending}
                      onChange={(event) =>
                        setSignupData((current) => ({
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

                <PasswordStrength password={signupData.password} />

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-base-300 bg-base-200/45 p-3 transition hover:bg-base-200/70">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mt-0.5"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    disabled={isPending}
                    required
                  />

                  <span className="text-xs leading-5 text-base-content/60">
                    I agree to the{" "}
                    <Link
                      to="/docs#terms"
                      className="font-semibold text-primary hover:underline"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/docs#privacy"
                      className="font-semibold text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <button
                  className="btn btn-primary h-12 w-full rounded-2xl font-semibold"
                  type="submit"
                  disabled={!canSubmit || isPending}
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Creating account
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRightIcon className="size-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-base-content/60">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-200/45 p-4 text-sm text-base-content/60">
              <div className="flex gap-3">
                <LockKeyholeIcon className="mt-0.5 size-5 shrink-0 text-base-content/45" />
                <p>
                  After signup, you’ll verify your email before unlocking posting,
                  messaging, follows, reports, and calls.
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
                title="Built for real communities"
                description="Follow friends, manage privacy, and keep your social space organized."
              />

              <FeatureRow
                icon={MessageCircleIcon}
                title="Messaging and calls"
                description="Chat, call, send voice messages, and stay connected without heavy UI."
              />

              <FeatureRow
                icon={ShieldCheckIcon}
                title="Safety from the start"
                description="Reports, blocking, private accounts, email verification, and moderation tools."
              />

              <FeatureRow
                icon={LockKeyholeIcon}
                title="Local-ready foundation"
                description="Test on one PC now, then connect MongoDB, Redis, SMTP, and storage later."
              />
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
};

export default SignUpPage;