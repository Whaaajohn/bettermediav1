import { createElement } from "react";
import { Link } from "react-router";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CompassIcon,
  Globe2Icon,
  HeartHandshakeIcon,
  HeartIcon,
  LanguagesIcon,
  LifeBuoyIcon,
  MessageCircleIcon,
  PhoneIcon,
  PlusCircleIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import { AuthFooter, AuthHeader } from "../components/AuthChrome.jsx";
import "./LandingPage.css";

const featureRows = [
  {
    icon: CompassIcon,
    title: "A feed that feels alive",
    copy: "Posts, media, replies, hashtags, reposts, bookmarks, and discovery wrapped in one clean flow.",
  },
  {
    icon: MessageCircleIcon,
    title: "Messages built into the core",
    copy: "DMs, groups, reactions, voice messages, typing, delivered states, and calls without leaving the app.",
  },
  {
    icon: LanguagesIcon,
    title: "Language-aware communities",
    copy: "Find people, interests, and groups by the languages you speak or the languages you are learning.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Control without the clutter",
    copy: "Privacy, reports, blocking, appeals, moderation, admin review, and account safety tools stay easy to reach.",
  },
];

const levelCards = [
  {
    eyebrow: "Level 01",
    title: "First impression",
    copy: "A cinematic hero with focused copy, strong spacing, and motion that feels expensive instead of noisy.",
  },
  {
    eyebrow: "Level 02",
    title: "Product confidence",
    copy: "The interface preview shows the real shape of the app: feed, messages, language groups, guided help, and safety.",
  },
  {
    eyebrow: "Level 03",
    title: "Trust and control",
    copy: "The page explains what makes BetterMedia different: local-first thinking, privacy controls, and admin power.",
  },
];

const safetyCards = [
  {
    icon: LifeBuoyIcon,
    title: "Guided help",
    copy: "Guide users through app features, reports, appeals, settings, and language practice.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Member controls",
    copy: "Privacy settings, blocks, muted words, sessions, login safety, and profile controls.",
  },
  {
    icon: UsersRoundIcon,
    title: "Admin review",
    copy: "Reports, appeals, moderation actions, diagnostics, and community tools in one place.",
  },
];

function ProductSidebar() {
  return (
    <aside className="intro-preview-sidebar" aria-label="Product navigation preview">
      <div className="intro-preview-logo">
        <span><UsersRoundIcon /></span>
        <div>
          <strong>BetterMedia</strong>
          <small>Local social</small>
        </div>
      </div>

      <nav aria-label="Preview sections">
        <span className="active"><UsersRoundIcon /> Feed</span>
        <span><MessageCircleIcon /> Messages</span>
        <span><SearchIcon /> Explore</span>
        <span><Globe2Icon /> Language</span>
      </nav>

      <Link className="intro-preview-create" to="/signup">
        <PlusCircleIcon /> Create post
      </Link>
    </aside>
  );
}

function ProductPost() {
  return (
    <article className="intro-preview-post intro-lift-card">
      <header>
        <span className="intro-avatar">M</span>
        <div>
          <strong>Maya</strong>
          <small>Spanish practice - just now</small>
        </div>
        <span className="intro-status-pill">Live</span>
      </header>

      <p>Practicing a little every day finally feels natural. I found people who actually make learning fun.</p>

      <div className="intro-post-language">
        <LanguagesIcon />
        <div>
          <strong>Language practice</strong>
          <small>English to Spanish group</small>
        </div>
      </div>

      <footer>
        <span><HeartIcon /> 2.4k</span>
        <span><MessageCircleIcon /> 318</span>
        <span><Globe2Icon /> Public</span>
      </footer>
    </article>
  );
}

function ProductPreview() {
  return (
    <div className="intro-preview-wrap" aria-label="BetterMedia interface preview">
      <div className="intro-orbit intro-orbit-one" />
      <div className="intro-orbit intro-orbit-two" />

      <div className="intro-preview-shell">
        <ProductSidebar />

        <section className="intro-preview-feed">
          <div className="intro-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="intro-preview-tabs">
            <span className="active"><HeartHandshakeIcon /> For You</span>
            <span><UsersRoundIcon /> Following</span>
            <span><Globe2Icon /> Language</span>
          </div>

          <ProductPost />

          <article className="intro-call-card intro-lift-card">
            <div>
              <span className="intro-avatar intro-avatar-teal">J</span>
              <div>
                <strong>Group call ready</strong>
                <small>3 friends online - clean handoff</small>
              </div>
            </div>
            <Link to="/signup"><PhoneIcon /> Join</Link>
          </article>
        </section>

        <aside className="intro-preview-rail">
          <div className="intro-rail-card intro-bot-card intro-lift-card">
            <div><LifeBuoyIcon /><strong>Support help</strong></div>
            <p>Ask about features, privacy, reports, appeals, or language practice.</p>
            <Link to="/signup">Message support <ArrowRightIcon /></Link>
          </div>

          <div className="intro-rail-card intro-lift-card">
            <div><CompassIcon /><strong>Trending</strong></div>
            <p>Find the conversations moving through your community right now.</p>
            <span>#welcome</span>
          </div>

          <div className="intro-rail-card intro-lift-card">
            <div><ShieldCheckIcon /><strong>Safety</strong></div>
            <p>Reports, blocks, privacy, sessions, and admin review stay built in.</p>
            <span>Protected</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CommunityPreview() {
  return (
    <div className="intro-community-preview intro-lift-card">
      <div className="intro-community-search"><SearchIcon /> Search people, hashtags, posts, and languages</div>

      <div className="intro-community-person">
        <span className="intro-avatar intro-avatar-teal">A</span>
        <div>
          <strong>Alex</strong>
          <small>English - learning Japanese</small>
        </div>
        <span>Follow</span>
      </div>

      <div className="intro-community-person">
        <span className="intro-avatar intro-avatar-purple">L</span>
        <div>
          <strong>Leah</strong>
          <small>Spanish - learning English</small>
        </div>
        <span>Follow</span>
      </div>

      <div className="intro-language-row">
        <LanguagesIcon />
        <div>
          <strong>Language groups</strong>
          <small>Find posts and people by the languages you use.</small>
        </div>
        <ArrowRightIcon />
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="intro-page">
      <div className="intro-background" aria-hidden="true">
        <span className="intro-noise" />
        <span className="intro-glow intro-glow-one" />
        <span className="intro-glow intro-glow-two" />
        <span className="intro-grid" />
      </div>

      <AuthHeader
        actionTo="/signup"
        actionLabel="Create account"
        mobileLabel="Sign up"
        trailing={<Link className="intro-signin-link" to="/login">Sign in</Link>}
      />

      <main>
        <section className="intro-hero">
          <div className="intro-hero-copy">
            <span className="intro-kicker"><HeartHandshakeIcon /> BetterMedia, made for people</span>
            <h1>Social media with taste, control, and real features.</h1>
            <p>
              BetterMedia brings posts, messages, calls, language groups, privacy tools,
              moderation, and a local-first mindset into one smooth experience.
            </p>

            <div className="intro-actions">
              <Link className="btn btn-primary intro-primary-action" to="/signup">
                Create your account <ArrowRightIcon />
              </Link>
              <Link className="btn intro-secondary-action" to="/login">
                Sign in
              </Link>
            </div>

            <div className="intro-fact-row" aria-label="BetterMedia highlights">
              <span><CheckCircle2Icon /> Local-first foundation</span>
              <span><CheckCircle2Icon /> Social, chat, and calls</span>
              <span><CheckCircle2Icon /> Admin-ready controls</span>
            </div>

            <div className="intro-theme-note" aria-live="polite">
              <span className="intro-theme-note-default">Clean launch mode - calm motion, human-first social, sharp polish.</span>
              <span className="intro-theme-note-christmas">Christmas mode - ribbon lights, crisp snow, warm community energy.</span>
              <span className="intro-theme-note-halloween">Halloween mode - midnight cards, ember sparks, polished spooky details.</span>
              <span className="intro-theme-note-black-history">Black History mode - gold rhythm, red and green accents, proud texture.</span>
              <span className="intro-theme-note-new-year">New Year mode - countdown shine, bright sparks, midnight celebration.</span>
            </div>
          </div>

          <ProductPreview />
        </section>

        <section id="about" className="intro-section intro-features">
          <div className="intro-section-heading">
            <span><HeartHandshakeIcon /> What makes it feel human</span>
            <h2>Every section has a job. Nothing is just decoration.</h2>
            <p>
              The page shows the actual product idea fast: what people can do,
              why it feels different, and why they should create an account.
            </p>
          </div>

          <div className="intro-feature-list">
            {featureRows.map(({ icon: Icon, title, copy }) => (
              <article className="intro-lift-card" key={title}>
                <span>{createElement(Icon)}</span>
                <div><h3>{title}</h3><p>{copy}</p></div>
                <ArrowRightIcon />
              </article>
            ))}
          </div>
        </section>

        <section className="intro-section intro-levels-section" aria-label="Design levels">
          <div className="intro-section-heading intro-centered-heading">
            <span><UsersRoundIcon /> Designed around people</span>
            <h2>Perfection is not one effect. It is layers working together.</h2>
            <p>
              Clear hierarchy, calm motion, real product proof, and confident calls to action.
            </p>
          </div>

          <div className="intro-level-grid">
            {levelCards.map((card) => (
              <article className="intro-level-card intro-lift-card" key={card.title}>
                <small>{card.eyebrow}</small>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="socials" className="intro-section intro-community-section">
          <CommunityPreview />

          <div className="intro-community-copy">
            <span><UsersRoundIcon /> Find your people</span>
            <h2>Built for sharing, learning, and staying close.</h2>
            <p>
              Follow people, discover interests, join language groups, and keep conversations
              connected without making the interface feel heavy.
            </p>
            <Link className="btn btn-primary intro-primary-action" to="/signup">
              Start exploring <ArrowRightIcon />
            </Link>
          </div>
        </section>

        <section id="safety" className="intro-section intro-safety-section">
          <div className="intro-safety-copy">
            <span><ShieldCheckIcon /> Safety and control</span>
            <h2>Powerful tools, clean presentation.</h2>
            <p>
              BetterMedia can show trust without looking boring: privacy, reports,
              blocking, appeals, moderation, guided help, and admin review all feel part of
              the same premium system.
            </p>
          </div>

          <div className="intro-safety-grid">
            {safetyCards.map(({ icon: Icon, title, copy }) => (
              <article className="intro-lift-card" key={title}>
                {createElement(Icon)}
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="intro-final">
          <div>
            <span><HeartHandshakeIcon /> BetterMedia is ready for real communities</span>
            <h2>Make the first click feel like the product is already elite.</h2>
            <p>Create an account, finish your profile, and start exploring.</p>
          </div>
          <div>
            <Link className="btn btn-primary intro-primary-action" to="/signup">
              Create account <ArrowRightIcon />
            </Link>
            <Link className="btn intro-secondary-action" to="/login">Sign in</Link>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
}

export default LandingPage;
