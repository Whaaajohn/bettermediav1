import { LANGUAGE_TO_FLAG } from "../constants";

export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const escapeSvg = (value) =>
  value.replace(/[&<>"']/g, (char) => {
    const escapes = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return escapes[char];
  });

const toBase64 = (value) => {
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
};

export const makeLocalAvatar = (seed = "User") => {
  const label =
    seed
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const colors = ["#2563eb", "#0f766e", "#be123c", "#7c3aed", "#c2410c"];
  const color = colors[[...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="80" fill="${color}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">${escapeSvg(label)}</text></svg>`;

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
};

export function getLanguageFlag(language) {
  if (!language) return null;

  const countryCode = LANGUAGE_TO_FLAG[language.toLowerCase()];

  if (countryCode) {
    return countryCode.toUpperCase();
  }

  return null;
}

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Offline";

  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Date(lastSeen).toLocaleDateString();
};
