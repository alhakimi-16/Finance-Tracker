import { createContext, useContext } from "react";

/** The test version keeps the current page in memory instead of the address bar. */
export type PreviewRouter = {
  href: string;
  navigate: (href: string) => void;
  replace: (href: string) => void;
};

export const RouterContext = createContext<PreviewRouter | null>(null);

export function usePreviewRouter(): PreviewRouter {
  const router = useContext(RouterContext);
  if (!router) throw new Error("usePreviewRouter must be used inside <RouterContext>");
  return router;
}
