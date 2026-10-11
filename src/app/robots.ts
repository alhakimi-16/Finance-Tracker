import type { MetadataRoute } from "next";

/** A private tool: no search engine should list it. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
