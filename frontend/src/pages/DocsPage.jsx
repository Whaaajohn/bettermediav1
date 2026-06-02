import { createElement, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CodeIcon,
  CompassIcon,
  FileTextIcon,
  FlagIcon,
  Globe2Icon,
  HeartHandshakeIcon,
  HomeIcon,
  InfoIcon,
  LockKeyholeIcon,
  MailCheckIcon,
  MessageCircleIcon,
  PhoneIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShipWheelIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";

import { AuthFooter } from "../components/AuthChrome.jsx";

const sections = [
  {
    id: "about",
    label: "About",
    icon: CompassIcon,
    title: "About BetterMedia",
    description:
      "Everything users need to understand the app, stay safe, manage privacy, and use features correctly.",
    cards: [
      {
        title: "What BetterMedia is",
        text: "BetterMedia is a social app for posting, messaging, calls, communities, language discovery, and local-first testing.",
      },
      {
        title: "Who it is for",
        text: "It is built for friends, creators, learners, communities, and private groups who want a cleaner social space.",
      },
      {
        title: "Core idea",
        text: "Users should control their account, privacy, posts, messages, and community experience without the app feeling complicated.",
      },
    ],
  },
  {
    id: "socials",
    label: "Socials",
    icon: UsersRoundIcon,
    title: "Social Features",
    description:
      "The app is built around profiles, posts, followers, reposts, language discovery, and clean conversations.",
    cards: [
      {
        title: "Profiles",
        text: "Users have names, usernames, profile pictures, bios, languages, badges, privacy settings, followers, following, archives, and reposts.",
      },
      {
        title: "Posts",
        text: "Users can post text, images, videos, audio, captions, thumbnails, hashtags, categories, target languages, comments, replies, likes, dislikes, saves, and reposts.",
      },
      {
        title: "Discovery",
        text: "For You, Following, Language, Trending, Discover, hashtag pages, and user search all help people find the right posts and language partners.",
      },
      {
        title: "Communication",
        text: "Messages, voice notes, read receipts, typing indicators, notifications, audio calls, video calls, and screenshare are part of the same account system.",
      },
    ],
  },
  {
    id: "getting-started",
    label: "Getting started",
    icon: UserRoundIcon,
    title: "Getting Started",
    description:
      "Set up your account correctly before using the full app.",
    steps: [
      "Create an account with your email.",
      "Verify your email to unlock posting, messaging, follows, reports, comments, and reposts.",
      "Complete onboarding with your name, username, bio, languages, and privacy settings.",
      "Choose whether your account is public or private.",
      "Start by following people you know or searching in Explore.",
    ],
  },
  {
    id: "safety",
    label: "Safety",
    icon: ShieldCheckIcon,
    title: "Safety Center",
    description:
      "Protect your account, identity, and private information.",
    rules: [
      "Never share your password or verification codes.",
      "Use a strong password with letters, numbers, and symbols.",
      "Only verify codes inside the official BetterMedia verification page.",
      "Log out from shared devices.",
      "Report suspicious messages, impersonation, scams, or harassment.",
      "Do not share private personal details with people you do not trust.",
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: LockKeyholeIcon,
    title: "Privacy Controls",
    description:
      "BetterMedia should let users choose how public or private they want to be.",
    cards: [
      {
        title: "Private accounts",
        text: "Private accounts require approval before new followers can see protected content.",
      },
      {
        title: "Follower visibility",
        text: "Users can choose whether followers and following lists are visible.",
      },
      {
        title: "Messages",
        text: "Users can control who can message them: everyone, followers, mutuals, or nobody.",
      },
      {
        title: "Blocking",
        text: "Blocking should stop profile access, messaging, follows, and unwanted interaction.",
      },
    ],
  },
  {
    id: "terms",
    label: "Terms",
    icon: FileTextIcon,
    title: "Terms and User Responsibilities",
    description:
      "A simple public version of the rules users agree to when they create an account.",
    rules: [
      "Use your own account and do not impersonate another person.",
      "Do not harass, threaten, scam, spam, dox, or target people with hate.",
      "Only upload content you have the right to share.",
      "Respect private accounts, blocks, message settings, reports, and moderation decisions.",
      "Do not attempt to evade bans, abuse verification, scrape private data, or attack the local server.",
      "Admins may remove content, restrict features, or ban accounts to protect the community.",
    ],
  },
  {
    id: "posting",
    label: "Posting",
    icon: FileTextIcon,
    title: "Posting Guidelines",
    description:
      "Posts should be useful, respectful, and safe for the community.",
    rules: [
      "Do not post threats, harassment, scams, or impersonation.",
      "Do not post private information about another person.",
      "Avoid spam, fake giveaways, and misleading posts.",
      "Use media responsibly. Do not upload content that violates someone’s privacy.",
      "Keep posts clear and meaningful. Empty posts and banner-only posts should be blocked.",
      "Use hashtags and languages honestly so discovery works correctly.",
    ],
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageCircleIcon,
    title: "Messages and DMs",
    description:
      "Messages are for real conversations, not spam or pressure.",
    cards: [
      {
        title: "Direct messages",
        text: "Users can chat privately when allowed by both accounts’ privacy settings.",
      },
      {
        title: "Voice messages",
        text: "Voice messages should be clear, short, and respectful. Users should be able to delete or report abusive voice messages.",
      },
      {
        title: "Edited messages",
        text: "Edited messages should show an edited indicator so conversations stay honest.",
      },
      {
        title: "Deleted messages",
        text: "Deleted messages should show a simple deleted state without exposing removed content.",
      },
    ],
  },
  {
    id: "calls",
    label: "Calls",
    icon: PhoneIcon,
    title: "Calls, Camera, and Screen Share",
    description:
      "Calls should feel smooth, private, and easy to control.",
    rules: [
      "Users should clearly see when mic, camera, or screen sharing is active.",
      "Camera and mic buttons should be easy to reach.",
      "Switching tabs should not disconnect the call.",
      "The call window should be draggable or minimized when possible.",
      "Screen share should show a clear indicator.",
      "Users should be able to leave a call instantly.",
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FlagIcon,
    title: "Reports and Moderation",
    description:
      "Reports help keep the app safe without making moderation feel random.",
    steps: [
      "User reports a post, comment, message, profile, or call issue.",
      "The report goes to moderators or admins.",
      "Staff reviews the report with context.",
      "Staff can dismiss, warn, restrict, ban, or remove content.",
      "The action should be logged in the admin panel.",
      "Users should be able to appeal serious restrictions.",
    ],
  },
  {
    id: "community",
    label: "Community rules",
    icon: UsersRoundIcon,
    title: "Community Rules",
    description:
      "Simple rules make the app feel safe without killing the vibe.",
    rules: [
      "Respect people even when you disagree.",
      "No harassment, threats, hate, or targeted bullying.",
      "No spam, fake accounts, or impersonation.",
      "No sharing someone’s private information.",
      "No pressuring users into uncomfortable conversations.",
      "No abusing reports, follows, messages, or calls.",
      "Creators and admins should follow the same rules as everyone else.",
    ],
  },
  {
    id: "verification",
    label: "Verification",
    icon: MailCheckIcon,
    title: "Email Verification and Badges",
    description:
      "Verification should protect the account system and make trust easier.",
    cards: [
      {
        title: "Email verification",
        text: "Email verification proves the user controls the email connected to the account.",
      },
      {
        title: "Verified badge",
        text: "A check badge should be used carefully. It should mean the account is trusted, notable, or approved by staff.",
      },
      {
        title: "Admin badge",
        text: "Admin badges should only appear for real admin accounts and should not be user-editable.",
      },
      {
        title: "Creator badges",
        text: "Creator badges can reward active users without giving unfair power.",
      },
    ],
  },
  {
    id: "local-hosting",
    label: "Local hosting",
    icon: ServerIcon,
    title: "Local Hosting and Server Setup",
    description:
      "BetterMedia can be tested locally before using production hosting.",
    steps: [
      "Run the backend server locally on your PC.",
      "Run the frontend locally with Vite or your chosen frontend tool.",
      "Use local JSON storage for testing.",
      "Optionally upgrade to MongoDB when the app grows.",
      "Use SMTP for email verification and password reset.",
      "Use a tunnel only when sharing with trusted testers.",
      "Keep secrets inside .env and never commit them to GitHub.",
    ],
  },
  {
    id: "admin",
    label: "Admin tools",
    icon: SettingsIcon,
    title: "Admin and Moderator Tools",
    description:
      "Admins should have power, but every action should be controlled and logged.",
    cards: [
      {
        title: "Reports",
        text: "Admins can review reports, dismiss false reports, and resolve real issues.",
      },
      {
        title: "Appeals",
        text: "Banned or restricted users can appeal. Staff should approve or deny with a clear response.",
      },
      {
        title: "User actions",
        text: "Admins can warn, ban, unban, verify, remove badges, or reset profile photos.",
      },
      {
        title: "Audit logs",
        text: "Every serious staff action should be logged so the server owner can review it later.",
      },
    ],
  },
  {
    id: "media-bot",
    label: "Media bot",
    icon: SparklesIcon,
    title: "MEDIA ModBot",
    description:
      "The local bot is a constrained helper for moderation, language practice, reporting, and account safety.",
    cards: [
      {
        title: "What it can do",
        text: "It can explain rules, guide reports and appeals, help users practice language, scan new content locally, and create reviewable bot action records.",
      },
      {
        title: "What it cannot do",
        text: "It cannot secretly ban people, delete users, remove admins, clear logs, bypass privacy rules, or respond unless messaged, mentioned, or triggered by staff tooling.",
      },
      {
        title: "Local-first",
        text: "It uses hard local rules first, then Ollama models on this PC when available. If Ollama is offline, safe local fallbacks keep the app running.",
      },
      {
        title: "Admin training",
        text: "Admins can edit bot rules, runtime scan settings, confidence actions, escalation wording, blocked topics, and the bot action queue.",
      },
    ],
  },
  {
    id: "faq",
    label: "FAQ",
    icon: InfoIcon,
    title: "Frequently Asked Questions",
    description:
      "Quick answers for common user questions.",
    faqs: [
      {
        q: "Why do I need to verify my email?",
        a: "Verification protects the app from fake accounts and unlocks full features like posting, messaging, follows, reports, comments, and reposts.",
      },
      {
        q: "Can I make my account private?",
        a: "Yes. Private accounts should require approval before new followers can access protected content.",
      },
      {
        q: "Can I block someone?",
        a: "Yes. Blocking should stop unwanted profile access, messaging, follows, and interactions.",
      },
      {
        q: "What happens when I report something?",
        a: "A report goes to staff for review. Staff can dismiss it, warn the user, remove content, or apply restrictions.",
      },
      {
        q: "Can BetterMedia run locally?",
        a: "Yes. The app can run locally for testing, with optional upgrades like MongoDB, SMTP, Redis, and production hosting later.",
      },
    ],
  },
];

const quickLinks = [
  ["Start using app", "/", HomeIcon],
  ["Explore people", "/explore", SearchIcon],
  ["Messages", "/messages", MessageCircleIcon],
  ["Settings", "/settings", SettingsIcon],
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function SectionIcon({ icon }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-base-200">
      {createElement(icon, { className: "size-5 text-base-content/65" })}
    </div>
  );
}

function SoftCard({ title, text }) {
  return (
    <div className="rounded-[1.25rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-base-content/55">{text}</p>
    </div>
  );
}

function RuleList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item}
          className="flex gap-3 rounded-2xl border border-base-300 bg-base-100 p-3"
        >
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-6 text-base-content/65">{item}</p>
        </div>
      ))}
    </div>
  );
}

function StepList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item}
          className="flex gap-3 rounded-2xl border border-base-300 bg-base-100 p-3"
        >
          <div className="grid size-6 shrink-0 place-items-center rounded-full bg-base-200 text-xs font-bold text-base-content/60">
            {index + 1}
          </div>
          <p className="text-sm leading-6 text-base-content/65">{item}</p>
        </div>
      ))}
    </div>
  );
}

function FAQList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-2xl border border-base-300 bg-base-100 p-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
            {item.q}
            <ChevronRightIcon className="size-4 shrink-0 transition group-open:rotate-90" />
          </summary>
          <p className="mt-3 text-sm leading-6 text-base-content/60">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

function DocsSection({ section }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-[1.7rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <SectionIcon icon={section.icon} />

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-base-content/40">
            {section.label}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {section.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/55">
            {section.description}
          </p>
        </div>
      </div>

      {section.cards && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {section.cards.map((card) => (
            <SoftCard key={card.title} title={card.title} text={card.text} />
          ))}
        </div>
      )}

      {section.rules && <RuleList items={section.rules} />}
      {section.steps && <StepList items={section.steps} />}
      {section.faqs && <FAQList items={section.faqs} />}
    </section>
  );
}

export default function DocsPage() {
  const location = useLocation();
  const [activeId, setActiveId] = useState(sections[0].id);
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = normalizeText(query).trim();

    if (!q) return sections;

    return sections.filter((section) => {
      const searchable = [
        section.label,
        section.title,
        section.description,
        ...(section.cards || []).flatMap((card) => [card.title, card.text]),
        ...(section.rules || []),
        ...(section.steps || []),
        ...(section.faqs || []).flatMap((faq) => [faq.q, faq.a]),
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeText(searchable).includes(q);
    });
  }, [query]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [filteredSections]);

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [location.hash]);

  return (
    <div className="min-h-full bg-base-100 text-base-content">
      <header className="border-b border-base-300 bg-base-100/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <ShipWheelIcon className="size-8 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight">
                BetterMedia
              </p>
              <p className="-mt-1 text-xs text-base-content/45">
                Docs and safety center
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="hidden rounded-full border border-base-300 px-4 py-2 text-sm font-medium text-base-content/65 transition hover:bg-base-200 hover:text-base-content sm:inline-flex"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)_18rem] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-3">
            <div className="rounded-[1.4rem] border border-base-300 bg-base-100 p-3 shadow-sm">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
                Contents
              </p>

              <nav className="space-y-1">
                {sections.map((section) => {
                  const active = activeId === section.id;

                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={[
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                        active
                          ? "bg-base-200 text-base-content"
                          : "text-base-content/55 hover:bg-base-200/60 hover:text-base-content",
                      ].join(" ")}
                    >
                      {createElement(section.icon, { className: "size-4 shrink-0" })}
                      <span className="truncate">{section.label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="rounded-[1.8rem] border border-base-300 bg-base-100 p-5 shadow-sm sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 py-1 text-xs text-base-content/55">
              <SparklesIcon className="size-3.5" />
              BetterMedia Help Center
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight">
              Documentation, safety, and community guidelines
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/55">
              A clean guide for users, moderators, admins, creators, and testers.
              Use this page to explain how the app works, how safety works, and
              what users should expect.
            </p>

            <div className="mt-5 max-w-2xl">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />

                <input
                  className="input input-bordered h-12 w-full rounded-2xl bg-base-100 pl-11 pr-11 shadow-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search docs, safety, privacy, calls, reports..."
                  autoComplete="off"
                  spellCheck="false"
                />

                {query && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-base-content/45 hover:bg-base-200 hover:text-base-content"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map((section) => {
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content/60"
                  >
                    {createElement(section.icon, { className: "size-4" })}
                    {section.label}
                  </a>
                );
              })}
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-10 text-center shadow-sm">
              <SearchIcon className="mx-auto size-9 text-base-content/35" />
              <h2 className="mt-3 font-semibold">No docs found</h2>
              <p className="mt-1 text-sm text-base-content/50">
                Try searching for privacy, reports, messages, calls, or hosting.
              </p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <DocsSection key={section.id} section={section} />
            ))
          )}
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-4">
            <section className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-base-content/45" />
                <h2 className="font-semibold">Quick links</h2>
              </div>

              <div className="mt-3 space-y-2">
                {quickLinks.map(([label, to, icon]) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
                  >
                    {createElement(icon, { className: "size-4" })}
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-4 text-warning" />
                <h2 className="font-semibold">Safety reminder</h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-base-content/55">
                Never share passwords, reset codes, private information, or
                anything that could let someone access your account.
              </p>
            </section>

            <section className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <HeartHandshakeIcon className="size-4 text-primary" />
                <h2 className="font-semibold">App values</h2>
              </div>

              <div className="mt-3 space-y-2 text-sm text-base-content/60">
                <p>Clean design</p>
                <p>User privacy</p>
                <p>Real moderation</p>
                <p>Local-first testing</p>
                <p>Safe communities</p>
              </div>
            </section>

            <section className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CodeIcon className="size-4 text-base-content/45" />
                <h2 className="font-semibold">Developer note</h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-base-content/55">
                Keep this page public so users can understand your app before
                signing up.
              </p>
            </section>
          </div>
        </aside>
      </main>

      <AuthFooter />
    </div>
  );
}
