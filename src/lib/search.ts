/**
 * Makes search forgiving: ignores case, accents and Arabic vowel marks,
 * and treats أ/إ/آ as ا, ى as ي and ة as ه.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .trim();
}
