/** Stands in for next/image; the logo is built into the page as a data URI. */
declare const __LOGO_DATA_URI__: string;

export default function Image({
  src,
  alt,
  width,
  height,
  className,
  loading,
  priority,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src === "/logo.png" ? __LOGO_DATA_URI__ : src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? "eager" : loading}
    />
  );
}
