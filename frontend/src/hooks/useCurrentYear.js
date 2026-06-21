import { useEffect, useState } from "react";

export default function useCurrentYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    const updateYear = () => setYear(new Date().getFullYear());
    const interval = window.setInterval(updateYear, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return year;
}
