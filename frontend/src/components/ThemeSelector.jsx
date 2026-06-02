import { CheckIcon, PaletteIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";
import useAuthUser from "../hooks/useAuthUser";
import { updateMySettings } from "../lib/api";

const ThemeSelector = () => {
  const { theme, setTheme } = useThemeStore();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const currentTheme =
    THEMES.find((themeOption) => themeOption.name === theme) || THEMES[0];

  const handleThemeChange = async (themeName) => {
    setTheme(themeName, authUser?._id);

    if (authUser?._id) {
      try {
        await updateMySettings({ theme: themeName });
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
      } catch (error) {
        console.warn("Could not save account theme", error);
      }
    }

    // closes daisyUI dropdown after selection
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="grid size-10 place-items-center rounded-full text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
        aria-label="Change theme"
        title={`Theme: ${currentTheme?.label || "Default"}`}
      >
        <PaletteIcon className="size-5" />
      </button>

      <div
        tabIndex={0}
        className="dropdown-content z-50 mt-3 w-64 overflow-hidden rounded-[1.35rem] border border-base-300 bg-base-100/95 p-2 shadow-2xl backdrop-blur-xl"
      >
        <div className="px-2 py-2">
          <p className="text-sm font-semibold">Appearance</p>
          <p className="text-xs text-base-content/45">
            Choose how BetterMedia looks.
          </p>
        </div>

        <div className="mt-1 max-h-72 space-y-1 overflow-y-auto pr-1">
          {THEMES.map((themeOption) => {
            const active = theme === themeOption.name;
            const colors = Array.isArray(themeOption.colors)
              ? themeOption.colors.slice(0, 4)
              : [];

            return (
              <button
                key={themeOption.name}
                type="button"
                className={[
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                  active
                    ? "bg-base-200 text-base-content"
                    : "text-base-content/65 hover:bg-base-200/70 hover:text-base-content",
                ].join(" ")}
                onClick={() => handleThemeChange(themeOption.name)}
                aria-pressed={active}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100">
                  <div className="grid grid-cols-2 gap-0.5">
                    {colors.length > 0 ? (
                      colors.map((color, index) => (
                        <span
                          key={`${themeOption.name}-${color}-${index}`}
                          className="size-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))
                    ) : (
                      <PaletteIcon className="size-4 text-base-content/45" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {themeOption.label}
                  </p>
                  <p className="truncate text-xs text-base-content/40">
                    {themeOption.name}
                  </p>
                </div>

                {active && (
                  <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-content">
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
