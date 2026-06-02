import { LoaderIcon, ShipWheelIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

const PageLoader = ({ label = "Loading BetterMedia..." }) => {
  const { theme } = useThemeStore();

  return (
    <div
      className="min-h-screen bg-base-100 text-base-content flex items-center justify-center px-4"
      data-theme={theme}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative grid size-20 place-items-center rounded-[1.6rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="absolute inset-0 rounded-[1.6rem] bg-primary/5" />

          <ShipWheelIcon className="size-9 text-primary" />

          <LoaderIcon className="absolute -right-2 -top-2 size-6 animate-spin rounded-full bg-base-100 p-1 text-primary shadow-sm" />
        </div>

        <p className="mt-4 text-sm font-semibold">{label}</p>

        <p className="mt-1 text-xs text-base-content/45">
          Getting everything ready
        </p>
      </div>
    </div>
  );
};

export default PageLoader;