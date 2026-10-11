"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { ErrorDetails } from "@/components/ErrorDetails";
import { useFinance } from "@/components/FinanceProvider";
import { Panel } from "@/components/Gate";
import { btn, cx } from "@/components/ui";

/** Takes the place of a page that crashed; the header stays. */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useFinance();
  return (
    <Panel icon={<TriangleAlert aria-hidden className="size-6" />} title={t.crash.title}>
      <p>{t.crash.body}</p>
      <ErrorDetails error={error} />
      <button type="button" onClick={() => retry()} className={cx(btn("gold"), "mt-6")}>
        <RotateCcw aria-hidden className="size-4" />
        {t.common.retry}
      </button>
    </Panel>
  );
}
