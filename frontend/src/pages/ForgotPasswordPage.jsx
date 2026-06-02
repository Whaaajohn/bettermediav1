import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  MailCheckIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthFooter, AuthHeader } from "../components/AuthChrome.jsx";
import { forgotPassword, resetPassword } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const RESET_CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;
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

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= MIN_PASSWORD_LENGTH },
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

function StepBadge({ active, label }) {
  return (
    <div
      className={[
        "rounded-xl px-3 py-2 text-center text-xs font-semibold transition",
        active ? "bg-base-100 text-base-content shadow-sm" : "text-base-content/45",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function RecoveryPreview() {
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
              <p className="font-semibold tracking-tight">Secure recovery</p>
              <p className="text-sm text-base-content/50">
                Reset codes go to your account email.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs font-medium text-base-content/55">
            Protected
          </div>
        </div>

        <div className="mt-7 space-y-2">
          {[
            ["Step 1", "Enter your email or username."],
            ["Step 2", "Use the 6-digit code from your email."],
            ["Step 3", "Create a stronger password."],
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
            Privacy-safe reset flow
          </div>

          <p className="mt-2 text-sm leading-6 text-base-content/55">
            The page uses a generic response so people cannot easily check which
            accounts exist.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    login: "",
    code: "",
    password: "",
  });

  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const loginReady = form.login.trim().length >= 3;
  const codeReady = form.code.length === RESET_CODE_LENGTH;
  const passwordReady = form.password.length >= MIN_PASSWORD_LENGTH;

  const canSubmit = useMemo(() => {
    if (!codeSent) return loginReady;
    return loginReady && codeReady && passwordReady;
  }, [codeSent, loginReady, codeReady, passwordReady]);

  const isNetworkError = (error) => {
    return !error?.response && !error?.status;
  };

  const { mutate: sendCode, isPending: sending } = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      setCodeSent(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("If that account exists, a reset code was sent.");
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        toast.error("Could not connect to the server. Try again.");
        return;
      }

      setCodeSent(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("If that account exists, a reset code was sent.");
    },
  });

  const { mutate: savePassword, isPending: resetting } = useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      toast.success(data?.message || "Password reset successfully");

      setForm({
        login: "",
        code: "",
        password: "",
      });

      setCodeSent(false);
      setShowPassword(false);
      setResendCooldown(0);

      navigate("/login");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not reset password"));
    },
  });

  const isBusy = sending || resetting;

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSendCode = () => {
    if (!loginReady || isBusy || resendCooldown > 0) return;

    sendCode({
      login: form.login.trim(),
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSubmit || isBusy) return;

    if (!codeSent) {
      handleSendCode();
      return;
    }

    savePassword({
      login: form.login.trim(),
      code: form.code,
      password: form.password,
    });
  };

  const handleDifferentAccount = () => {
    setCodeSent(false);
    setShowPassword(false);
    setResendCooldown(0);

    setForm((current) => ({
      ...current,
      code: "",
      password: "",
    }));
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
                Account recovery
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {codeSent ? "Check your reset code" : "Reset your password"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-base-content/60">
                {codeSent
                  ? "Enter the 6-digit code sent to the email connected to your account."
                  : "Use your email or username and recover your account safely."}
              </p>
            </div>

            <section className="rounded-[1.75rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-base-200 text-base-content/65">
                  {codeSent ? (
                    <LockKeyholeIcon className="size-5" />
                  ) : (
                    <KeyRoundIcon className="size-5" />
                  )}
                </div>

                <div>
                  <h2 className="font-semibold tracking-tight">
                    {codeSent ? "Create new password" : "Find your account"}
                  </h2>
                  <p className="text-sm text-base-content/50">
                    {codeSent ? "Step 2 of 2" : "Step 1 of 2"}
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 rounded-2xl border border-base-300 bg-base-200/70 p-1">
                <StepBadge active={!codeSent} label="Account" />
                <StepBadge active={codeSent} label="New password" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="form-control">
                  <span className="mb-1 text-sm font-medium text-base-content/75">
                    Email or username
                  </span>

                  <input
                    className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-[0.95rem] focus:outline-none"
                    value={form.login}
                    onChange={(event) => handleChange("login", event.target.value)}
                    placeholder="you@email.com or username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    disabled={isBusy || codeSent}
                    autoFocus
                    required
                  />
                </label>

                {codeSent && (
                  <>
                    <label className="form-control">
                      <span className="mb-1 text-sm font-medium text-base-content/75">
                        Reset code
                      </span>

                      <input
                        className="input input-bordered h-12 w-full rounded-2xl bg-base-100 text-center text-lg tracking-[0.35em] focus:outline-none"
                        value={form.code}
                        onChange={(event) =>
                          handleChange(
                            "code",
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, RESET_CODE_LENGTH)
                          )
                        }
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={RESET_CODE_LENGTH}
                        disabled={isBusy}
                        autoFocus
                        required
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-1 text-sm font-medium text-base-content/75">
                        New password
                      </span>

                      <div className="relative">
                        <input
                          className="input input-bordered h-12 w-full rounded-2xl bg-base-100 pr-12 text-[0.95rem] focus:outline-none"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(event) =>
                            handleChange("password", event.target.value)
                          }
                          placeholder="New password"
                          autoComplete="new-password"
                          minLength={MIN_PASSWORD_LENGTH}
                          disabled={isBusy}
                          required
                        />

                        <button
                          type="button"
                          className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
                          onClick={() => setShowPassword((value) => !value)}
                          disabled={isBusy}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOffIcon className="size-5" />
                          ) : (
                            <EyeIcon className="size-5" />
                          )}
                        </button>
                      </div>
                    </label>

                    <PasswordStrength password={form.password} />

                    <div className="rounded-2xl border border-base-300 bg-base-200/45 p-3 text-xs text-base-content/60">
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                        Use at least {MIN_PASSWORD_LENGTH} characters. A mix of
                        letters, numbers, and symbols is stronger.
                      </div>
                    </div>
                  </>
                )}

                <button
                  className="btn btn-primary h-12 w-full rounded-2xl font-semibold"
                  disabled={!canSubmit || isBusy}
                  type="submit"
                >
                  {isBusy ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      {codeSent ? "Resetting" : "Sending"}
                    </>
                  ) : codeSent ? (
                    <>
                      Reset password
                      <ArrowRightIcon className="size-4" />
                    </>
                  ) : (
                    <>
                      Send reset code
                      <ArrowRightIcon className="size-4" />
                    </>
                  )}
                </button>

                {codeSent && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="btn btn-ghost h-11 rounded-2xl"
                      disabled={isBusy || resendCooldown > 0}
                      onClick={handleSendCode}
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend code"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost h-11 rounded-2xl"
                      disabled={isBusy}
                      onClick={handleDifferentAccount}
                    >
                      Different account
                    </button>
                  </div>
                )}

                <Link to="/login" className="btn btn-ghost h-11 w-full rounded-2xl">
                  <ArrowLeftIcon className="size-4" />
                  Back to sign in
                </Link>
              </form>
            </section>

            <div className="mt-5 rounded-[1.35rem] border border-base-300 bg-base-200/45 p-4 text-sm text-base-content/60">
              <div className="flex gap-3">
                <LockKeyholeIcon className="mt-0.5 size-5 shrink-0 text-base-content/45" />
                <p>
                  Never share your reset code. BetterMedia should only ask for
                  it on this recovery page.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden items-center lg:flex">
          <div className="w-full space-y-5">
            <RecoveryPreview />

            <div id="about" className="grid gap-3">
              <FeatureRow
                icon={ShieldCheckIcon}
                title="Privacy-safe by design"
                description="The reset flow uses a generic response so people cannot easily check which accounts exist."
              />

              <FeatureRow
                icon={LockKeyholeIcon}
                title="Stronger password rules"
                description="New passwords need at least 8 characters and show a simple strength guide."
              />

              <FeatureRow
                icon={BookOpenIcon}
                title="Docs-ready support"
                description="Add recovery help, account safety docs, and troubleshooting pages as your app grows."
              />
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
}