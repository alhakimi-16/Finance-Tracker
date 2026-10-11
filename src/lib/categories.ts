import {
  CalendarDays,
  Coffee,
  Flag,
  HandHeart,
  Landmark,
  Package,
  Receipt,
  Tag,
  TrainFront,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Kind } from "./types";

/**
 * The categories offered in the form. The id is what the database stores; the names live
 * in src/i18n/dictionaries.ts under `categories`. To add one: add a line here and a name in
 * both languages there.
 */
export const categories: { id: string; kinds: Kind[]; icon: LucideIcon }[] = [
  { id: "membership", kinds: ["income"], icon: Users },
  { id: "donation", kinds: ["income"], icon: HandHeart },
  { id: "grant", kinds: ["income"], icon: Landmark },
  { id: "event", kinds: ["income", "expense"], icon: CalendarDays },
  { id: "food", kinds: ["expense"], icon: Coffee },
  { id: "supplies", kinds: ["expense"], icon: Package },
  { id: "travel", kinds: ["expense"], icon: TrainFront },
  { id: "fees", kinds: ["expense"], icon: Receipt },
  { id: "opening", kinds: ["income"], icon: Flag },
  { id: "other", kinds: ["income", "expense"], icon: Tag },
];

export const defaultCategory = "other";

export function categoryIcon(id: string): LucideIcon {
  return categories.find((category) => category.id === id)?.icon ?? Tag;
}

/** Name in the current language; categories added directly in the database show their id. */
export function categoryName(id: string, t: Dictionary): string {
  return t.categories[id] ?? id;
}

/** Categories that fit a kind, keeping `current` in the list even if it belongs to the other kind. */
export function categoriesFor(kind: Kind, current?: string): string[] {
  const ids = categories.filter((category) => category.kinds.includes(kind)).map((category) => category.id);
  if (current && !ids.includes(current)) ids.unshift(current);
  return ids;
}
