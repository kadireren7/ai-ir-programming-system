/** Torqa wordmark glyph — keep in sync across marketing + app chrome. */
export function TorqaLogoMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className={className}
    >
      <path
        d="M8 18 L48 18 L56 26 L16 26 Z M8 38 L40 38 L48 46 L16 46 Z"
        fill="#22d3ee"
      />
      <circle cx="56" cy="46" r="2" fill="#67e8f9" />
    </svg>
  );
}
