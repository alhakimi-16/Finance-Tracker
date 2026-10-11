"use client";

import { Moon, Sun } from "lucide-react";
import { useFinance } from "./FinanceProvider";

/** Switches between light and dark. Without a saved choice the system setting applies. */
export function ThemeToggle() {
  const { t } = useFinance();

  function toggle() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // storage blocked (private window): the choice lasts until the page is closed
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative grid size-9 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-ink-soft transition-colors hover:text-ink"
    >
      {/* the label names what the click does, so it differs per theme */}
      <span className="sr-only dark:hidden">{t.theme.toDark}</span>
      <span className="sr-only hidden dark:inline">{t.theme.toLight}</span>
      <Moon aria-hidden className="size-[1.1rem] dark:hidden" />
      <Sun aria-hidden className="hidden size-[1.1rem] dark:block" />
    </button>
  );
}
