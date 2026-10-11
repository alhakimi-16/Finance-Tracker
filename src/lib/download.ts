/** Hands a file the page made (the CSV export) to the browser as a download. */
export async function downloadFile(name: string, content: string, type: string): Promise<void> {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
