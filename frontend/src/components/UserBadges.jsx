import {
  CheckIcon,
  CrownIcon,
  LanguagesIcon,
  ShieldCheckIcon,
  StarIcon,
} from "lucide-react";

const sealShape =
  "polygon(50% 0%,61% 15%,79% 8%,85% 27%,100% 35%,89% 50%,100% 65%,85% 73%,79% 92%,61% 85%,50% 100%,39% 85%,21% 92%,15% 73%,0% 65%,11% 50%,0% 35%,15% 27%,21% 8%,39% 15%)";

const badgeAliases = {
  adminVerified: "admin",
  langPro: "languagePro",
  language: "languagePro",
};

const badgePriority = {
  verified: 0,
  admin: 1,
  mod: 2,
  languagePro: 3,
  creator: 4,
  featured: 5,
};

const sealBadges = {
  verified: {
    label: "Verified",
    icon: CheckIcon,
    iconColor: "text-white",
    strokeWidth: 4.6,
    outer: "linear-gradient(135deg,#38bdf8 0%,#1d9bf0 55%,#0f6bdc 100%)",
    inner: "linear-gradient(135deg,#7dd3fc 0%,#1d9bf0 55%,#0ea5e9 100%)",
    shadow: "0 1px 5px rgba(29,155,240,0.38)",
  },

  admin: {
    label: "Admin",
    icon: CheckIcon,
    iconColor: "text-black",
    strokeWidth: 4.8,
    outer: "linear-gradient(135deg,#ffe44d 0%,#facc15 42%,#d97706 100%)",
    inner: "linear-gradient(135deg,#fff3a3 0%,#facc15 45%,#eab308 100%)",
    shadow: "0 1px 5px rgba(245,158,11,0.45)",
  },

  mod: {
    label: "Moderator",
    icon: ShieldCheckIcon,
    iconColor: "text-white",
    strokeWidth: 3.1,
    outer: "linear-gradient(135deg,#c084fc 0%,#8b5cf6 48%,#6d28d9 100%)",
    inner: "linear-gradient(135deg,#ddd6fe 0%,#a855f7 48%,#7c3aed 100%)",
    shadow: "0 1px 5px rgba(139,92,246,0.42)",
  },

  languagePro: {
    label: "Language Pro",
    icon: LanguagesIcon,
    iconColor: "text-white",
    strokeWidth: 3,
    outer: "linear-gradient(135deg,#5eead4 0%,#14b8a6 48%,#0f766e 100%)",
    inner: "linear-gradient(135deg,#99f6e4 0%,#2dd4bf 45%,#0d9488 100%)",
    shadow: "0 1px 5px rgba(20,184,166,0.42)",
  },
};

const pillBadges = {
  creator: {
    label: "Creator",
    shortLabel: "Creator",
    icon: CrownIcon,
    className:
      "border-amber-400/25 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  },

  featured: {
    label: "Featured",
    shortLabel: "Featured",
    icon: StarIcon,
    className:
      "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-600 dark:text-fuchsia-300",
  },
};

function SealBadge({ badge, compact = false }) {
  const config = sealBadges[badge];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center align-middle leading-none transition-transform duration-200 hover:scale-105 ${
        compact ? "size-[17px]" : "size-[19px]"
      }`}
      title={config.label}
      aria-label={config.label}
    >
      <span
        className="absolute inset-0"
        style={{
          clipPath: sealShape,
          background: config.outer,
          boxShadow: config.shadow,
        }}
      />

      <span
        className="absolute inset-[2.2px] opacity-95"
        style={{
          clipPath: sealShape,
          background: config.inner,
        }}
      />

      <Icon
        className={`relative z-10 ${config.iconColor} ${
          compact ? "size-[10.5px]" : "size-3"
        }`}
        strokeWidth={config.strokeWidth}
      />
    </span>
  );
}

function PillBadge({ badge, compact = false }) {
  const config = pillBadges[badge];
  if (!config) return null;

  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={`inline-grid size-[17px] shrink-0 place-items-center rounded-full border shadow-sm transition-transform duration-200 hover:scale-105 ${config.className}`}
        title={config.label}
        aria-label={config.label}
      >
        <Icon className="size-[10.5px]" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-[19px] shrink-0 items-center gap-1 rounded-full border px-1.5 text-[0.66rem] font-semibold leading-none shadow-sm transition-transform duration-200 hover:scale-[1.03] ${config.className}`}
      title={config.label}
      aria-label={config.label}
    >
      <Icon className="size-[11px]" strokeWidth={2.5} />
      <span>{config.shortLabel}</span>
    </span>
  );
}

export default function UserBadges({ badges = [], compact = false }) {
  const normalizedBadges = Array.isArray(badges)
    ? badges
        .map((badge) => String(badge || "").trim())
        .filter(Boolean)
        .map((badge) => badgeAliases[badge] || badge)
    : [];

  const orderedBadges = [...new Set(normalizedBadges)]
    .filter((badge) => sealBadges[badge] || pillBadges[badge])
    .sort((a, b) => (badgePriority[a] ?? 99) - (badgePriority[b] ?? 99));

  if (orderedBadges.length === 0) return null;

  return (
    <span className="inline-flex translate-y-[1px] items-center gap-[3px] align-middle leading-none">
      {orderedBadges.map((badge) =>
        sealBadges[badge] ? (
          <SealBadge key={badge} badge={badge} compact={compact} />
        ) : (
          <PillBadge key={badge} badge={badge} compact={compact} />
        )
      )}
    </span>
  );
}