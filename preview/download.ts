import type * as RealDownload from "@/lib/download";
import { downloadFile as browserDownload } from "@/lib/download";
import type * as ThisFile from "./download";

/**
 * Inside the Claude artifact viewer a page cannot start downloads itself; it asks the viewer through
 * the `downloads` capability, which shows a confirmation first. Opened as a plain file, the test
 * version downloads the normal way.
 */

type Downloads = { save(request: { filename: string; data: string }): Promise<{ status: string }> };
type ClaudeRuntime = { use(name: "downloads"): Promise<Downloads | null> };

export async function downloadFile(name: string, content: string, type: string): Promise<void> {
  const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
  const downloads = claude ? await claude.use("downloads") : null;
  if (!downloads) return browserDownload(name, content, type);
  try {
    await downloads.save({ filename: name, data: content });
  } catch {
    // the viewer declined or saving is not possible here: nothing else to do
  }
}

// keeps this file in step with src/lib/download.ts
type SameAsRealDownload<T extends typeof RealDownload> = T;
export type PreviewDownload = SameAsRealDownload<typeof ThisFile>;
