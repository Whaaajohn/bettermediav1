import { useQuery } from "@tanstack/react-query";

import { getSiteSettings } from "../lib/api.js";

export const fallbackSiteSettings = {
  appName: "BetterMedia",
  supportEmail: "support@bettermedia.app",
  supportSubjectPrefix: "BetterMedia support",
  instagramHandle: "bettermedia",
  instagramUrl: "https://www.instagram.com/bettermedia/",
  footerBlurb:
    "Built for private communities, language practice, messaging, calls, moderation, local testing, and production-ready hosting.",
  siteDesignMode: "default",
  siteDesignMotion: "calm",
  siteDesignDecorations: true,
};

export default function useSiteSettings() {
  const query = useQuery({
    queryKey: ["siteSettings"],
    queryFn: getSiteSettings,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    ...query,
    settings: {
      ...fallbackSiteSettings,
      ...(query.data || {}),
    },
  };
}
