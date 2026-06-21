import { createElement, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  HelpCircleIcon,
  InstagramIcon,
  LifeBuoyIcon,
  LockKeyholeIcon,
  LoaderIcon,
  MessageSquareWarningIcon,
  ShieldCheckIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthFooter, AuthHeader } from "../components/AuthChrome.jsx";
import useSiteSettings from "../hooks/useSiteSettings.js";
import { createSupportTicket } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/errors.js";

const categories = [
  "Login or signup",
  "Email verification",
  "Report or moderation",
  "Messages or calls",
  "Posts, comments, or media",
  "Bug or broken page",
  "Account safety",
  "Other",
];

const quickHelp = [
  {
    icon: LockKeyholeIcon,
    title: "Account access",
    copy: "Tell support the email or username, what page you are stuck on, and what error shows.",
  },
  {
    icon: MessageSquareWarningIcon,
    title: "Safety issue",
    copy: "Include usernames, links, timestamps, and whether someone is harassing, scamming, or impersonating.",
  },
  {
    icon: Clock3Icon,
    title: "Bug report",
    copy: "Say what you clicked, what you expected, what happened, and whether it happens again.",
  },
];

function InfoCard({ icon, title, copy }) {
  return (
    <article className="min-w-0 rounded-[1.35rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {createElement(icon, { className: "size-5" })}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 break-words text-sm leading-6 text-base-content/55">
            {copy}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function SupportPage() {
  const { settings } = useSiteSettings();
  const [ticketResult, setTicketResult] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    category: categories[0],
    subject: "",
    details: "",
    steps: "",
  });

  const { mutate: openTicket, isPending } = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: (data) => {
      setTicketResult(data);
      toast.success(
        data?.mail?.receipt?.sent
          ? "Support ticket opened and receipt emailed"
          : "Support ticket opened"
      );
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not open support ticket")),
  });

  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canSend = emailReady && form.details.trim().length >= 10 && !isPending;

  const updateField = (field, value) => {
    setTicketResult(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSend) return;
    openTicket(form);
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-base-100 text-base-content">
      <AuthHeader
        actionTo="/signup"
        actionLabel="Create account"
        mobileLabel="Sign up"
        trailing={
          <Link
            to="/login"
            className="rounded-full px-3 py-2 text-sm font-semibold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
          >
            Sign in
          </Link>
        }
      />

      <main className="mx-auto grid w-full max-w-[100vw] grid-cols-1 gap-8 overflow-hidden px-4 py-8 sm:max-w-7xl sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8 lg:py-12">
        <section className="flex min-w-0 items-center">
          <div className="min-w-0 w-full max-w-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium text-base-content/60">
              <LifeBuoyIcon className="size-3.5" />
              Support center
            </div>

            <h1 className="mt-4 max-w-full break-words text-4xl font-bold tracking-tight sm:max-w-xl sm:text-5xl">
              Need help? Send the problem straight to support.
            </h1>

            <p className="mt-4 max-w-full break-words text-sm leading-7 text-base-content/60 sm:max-w-xl sm:text-base">
              Use this page before or after logging in. Fill in what happened,
              open a ticket inside BetterMedia, and support will get the
              details without making you jump into Gmail.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#support-form"
                className="btn btn-primary rounded-2xl"
              >
                <LifeBuoyIcon className="size-4" />
                Open a ticket
              </a>

              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn rounded-2xl border-base-300 bg-base-100"
                >
                  <InstagramIcon className="size-4" />
                  Instagram
                </a>
              )}
            </div>

            <div className="mt-7 grid max-w-full gap-3">
              {quickHelp.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section
          id="support-form"
          className="min-w-0 rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Open a support ticket
              </h2>
              <p className="mt-1 text-sm leading-6 text-base-content/55">
                Routed to {settings.supportEmail}
              </p>
            </div>

            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircleIcon className="size-6" />
            </div>
          </div>

          {ticketResult?.ticket && (
            <div className="mt-4 rounded-2xl border border-success/25 bg-success/10 p-3 text-sm text-success">
              <div className="flex gap-2">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Ticket {ticketResult.ticket.ticketNumber} opened.
                  </p>
                  <p className="mt-1 text-success/80">
                    {ticketResult?.mail?.receipt?.sent
                      ? `We emailed a receipt to ${ticketResult.ticket.email}. Support will be in touch.`
                      : "The ticket is saved. Receipt email needs SMTP configured on this server."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="form-control">
                <span className="mb-1 text-sm font-medium text-base-content/75">
                  Name
                </span>
                <input
                  className="input input-bordered h-12 rounded-2xl bg-base-100"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                />
              </label>

              <label className="form-control">
                <span className="mb-1 text-sm font-medium text-base-content/75">
                  Email
                </span>
                <input
                  type="email"
                  className="input input-bordered h-12 rounded-2xl bg-base-100"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@gmail.com"
                  maxLength={120}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="form-control">
                <span className="mb-1 text-sm font-medium text-base-content/75">
                  Username
                </span>
                <input
                  className="input input-bordered h-12 rounded-2xl bg-base-100"
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  placeholder="@username"
                  maxLength={40}
                />
              </label>

              <label className="form-control">
                <span className="mb-1 text-sm font-medium text-base-content/75">
                  Category
                </span>
                <select
                  className="select select-bordered h-12 rounded-2xl bg-base-100"
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-control">
              <span className="mb-1 text-sm font-medium text-base-content/75">
                Short subject
              </span>
              <input
                className="input input-bordered h-12 rounded-2xl bg-base-100"
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Example: I cannot verify my email"
                maxLength={100}
              />
            </label>

            <label className="form-control">
              <span className="mb-1 text-sm font-medium text-base-content/75">
                What happened?
              </span>
              <textarea
                className="textarea textarea-bordered min-h-36 rounded-2xl bg-base-100"
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
                placeholder="Tell support what went wrong, what page you were on, and any error message you saw."
                maxLength={2000}
                required
              />
            </label>

            <label className="form-control">
              <span className="mb-1 text-sm font-medium text-base-content/75">
                Steps you already tried
              </span>
              <textarea
                className="textarea textarea-bordered min-h-24 rounded-2xl bg-base-100"
                value={form.steps}
                onChange={(event) => updateField("steps", event.target.value)}
                placeholder="Example: refreshed page, tried another browser, reset password..."
                maxLength={1000}
              />
            </label>

            <div className="rounded-2xl border border-base-300 bg-base-200/45 p-4 text-sm text-base-content/60">
              <div className="flex gap-3">
                <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-base-content/45" />
                <p>
                  Never send your password or verification code. Support only
                  needs your username, email, screenshots, links, and what
                  happened.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <button
                className="btn btn-primary h-12 rounded-2xl font-semibold"
                type="submit"
                disabled={!canSend}
              >
                {isPending ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <ArrowRightIcon className="size-4" />
                )}
                Open support ticket
              </button>

              <div className="rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-xs leading-5 text-base-content/55">
                Email and details are required so support can reply.
              </div>
            </div>
          </form>
        </section>
      </main>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-[1.6rem] border border-primary/15 bg-primary/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <LifeBuoyIcon className="size-4" />
                Fastest support messages include details.
              </div>
              <p className="mt-2 text-sm leading-6 text-base-content/60">
                Add screenshots or links in the details when you can,
                especially for login, moderation, safety, or bug issues.
              </p>
            </div>

            <Link
              to="/docs#safety"
              className="btn rounded-2xl border-base-300 bg-base-100"
            >
              Read safety docs
            </Link>
          </div>
        </div>
      </section>

      <AuthFooter />
    </div>
  );
}
