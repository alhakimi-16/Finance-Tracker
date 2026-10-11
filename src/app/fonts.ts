import { Cairo } from "next/font/google";

// Cairo covers Arabic and Latin in one family, close to the type on the VJSD poster.
// Downloaded at build time and served from this site, so browsers never contact Google.
export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});
