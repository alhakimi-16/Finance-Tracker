"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "./ui";

/**
 * A native <dialog>: keeps keyboard focus inside, closes with Esc, and is announced by screen
 * readers. The content is only rendered while open, so forms start fresh each time.
 * The element marked `data-autofocus` gets the focus when it opens.
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cx(
        "m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-card p-0 text-ink shadow-2xl",
        size === "sm" ? "max-w-md" : "max-w-xl",
      )}
    >
      {open && (
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-2xl font-black">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-m-1 inline-grid size-9 place-items-center rounded-full text-muted hover:bg-gold-100 hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
