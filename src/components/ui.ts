/**
 * Shared class names, so buttons and fields look the same everywhere.
 * Each one is split into "look" and "size", because two Tailwind classes for the same
 * property (say h-11 and h-9) don't override each other by their order in className.
 */

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const buttonLook =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const buttonColors = {
  gold: "bg-gold-600 text-white hover:bg-gold-700",
  income: "bg-income text-white hover:bg-income-deep",
  expense: "bg-expense text-white hover:bg-expense-deep",
  quiet: "border border-line-strong bg-card text-ink-soft hover:border-gold-500 hover:text-ink",
};

const buttonSizes = {
  md: "px-5 py-2.5",
  lg: "px-6 py-3 text-lg",
};

export function btn(color: keyof typeof buttonColors, size: keyof typeof buttonSizes = "md"): string {
  return cx(buttonLook, buttonColors[color], buttonSizes[size]);
}

export const iconButton =
  "inline-grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-gold-100 hover:text-ink";
export const iconButtonDanger =
  "inline-grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-expense-soft hover:text-expense";

/** Border, colours and focus ring of inputs and selects, without size. */
export const fieldLook =
  "rounded-2xl border border-line-strong bg-white text-ink outline-none transition-colors placeholder:text-muted/80 focus:border-gold-500 focus:ring-3 focus:ring-gold-200 aria-invalid:border-expense aria-invalid:ring-expense-soft";

/** A full-width input or select. */
export const field = cx(fieldLook, "h-11 w-full px-4");

export const label = "mb-1.5 block text-sm font-bold text-ink-soft";

export const card = "rounded-3xl border border-line bg-card shadow-card";

/** The gold pill from the VJSD poster, used as a section label. */
export const pill =
  "inline-flex items-center gap-1.5 rounded-full bg-gold-600 px-3.5 py-1 text-sm font-bold text-white";
