import { createElement } from "react";
import { categoryIcon } from "@/lib/categories";

/** The small icon of a category (decorative; the name is always written next to it). */
export function CategoryIcon({ id, className }: { id: string; className?: string }) {
  return createElement(categoryIcon(id), { "aria-hidden": true, className });
}
