import type { AnchorHTMLAttributes } from "react";
import { usePreviewRouter } from "./router";

/** Stands in for next/link: changes the page in memory. */
export default function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const router = usePreviewRouter();
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        router.navigate(href);
      }}
      {...rest}
    />
  );
}
