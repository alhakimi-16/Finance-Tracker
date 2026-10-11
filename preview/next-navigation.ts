import { usePreviewRouter } from "./router";

/** Stands in for next/navigation, reading the in-memory page instead of the address bar. */

export function usePathname(): string {
  return usePreviewRouter().href.split("?")[0];
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(usePreviewRouter().href.split("?")[1] ?? "");
}

export function useRouter() {
  const router = usePreviewRouter();
  return { push: router.navigate, replace: (href: string) => router.replace(href) };
}

export function notFound(): never {
  throw new Error("Page not found");
}
