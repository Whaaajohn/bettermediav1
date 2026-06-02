export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Cantonese",
  "Japanese",
  "Korean",
  "Hindi",
  "Urdu",
  "Bengali",
  "Punjabi",
  "Gujarati",
  "Marathi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Arabic",
  "Hebrew",
  "Persian",
  "Turkish",
  "Russian",
  "Ukrainian",
  "Polish",
  "Czech",
  "Slovak",
  "Romanian",
  "Hungarian",
  "Greek",
  "Italian",
  "Portuguese",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Icelandic",
  "Irish",
  "Welsh",
  "Swahili",
  "Yoruba",
  "Igbo",
  "Zulu",
  "Xhosa",
  "Amharic",
  "Somali",
  "Haitian Creole",
  "Jamaican Patois",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Tagalog",
  "Khmer",
  "Lao",
  "Burmese",
  "Nepali",
  "Sinhala",
  "Armenian",
  "Georgian",
  "Albanian",
  "Serbian",
  "Croatian",
  "Bosnian",
  "Bulgarian",
];

export function normalizeLanguage(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function languageLabel(value = "") {
  return normalizeLanguage(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const NORMALIZED_LANGUAGES = LANGUAGE_OPTIONS.map(normalizeLanguage);
