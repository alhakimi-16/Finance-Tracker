/** The technical reason behind a crash, so a screenshot is enough to find the cause. */
export function ErrorDetails({ error }: { error: Error & { digest?: string } }) {
  return (
    <pre
      dir="ltr"
      className="mt-4 rounded-2xl bg-field px-4 py-3 text-start font-mono text-xs break-all whitespace-pre-wrap text-ink-soft"
    >
      {[String(error), error.digest].filter(Boolean).join("\n")}
    </pre>
  );
}
