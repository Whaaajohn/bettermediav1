import { create } from "zustand";

const normalizeTheme = (theme) => (!theme || theme === "coffee" ? "media" : theme);
const themeKeyForUser = (userId) => `media-theme:${userId}`;

const initialTheme = normalizeTheme(localStorage.getItem("media-theme"));
localStorage.setItem("media-theme", initialTheme);

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  setTheme: (theme, userId = null) => {
    const normalized = normalizeTheme(theme);
    localStorage.setItem("media-theme", normalized);
    if (userId) localStorage.setItem(themeKeyForUser(userId), normalized);
    set({ theme: normalized });
  },
  hydrateThemeForUser: (user) => {
    const userId = user?._id;
    const savedForUser = userId ? localStorage.getItem(themeKeyForUser(userId)) : null;
    const nextTheme = normalizeTheme(user?.theme || savedForUser || localStorage.getItem("media-theme"));

    if (nextTheme !== get().theme) set({ theme: nextTheme });
    localStorage.setItem("media-theme", nextTheme);
    if (userId) localStorage.setItem(themeKeyForUser(userId), nextTheme);
  },
}));
