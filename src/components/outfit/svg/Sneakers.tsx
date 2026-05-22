interface Props {
  size?: number;
  className?: string;
}

/** Closed-toe sneakers — below 85°F when dry */
export default function Sneakers({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Sneakers">
      <path d="M 12 72 C 12 62 18 58 26 55 L 34 50 L 40 50 C 42 50 44 52 44 55 L 44 72 Z" fill="#FFFFFF" />
      <rect x="10" y="72" width="36" height="8" rx="3" fill="#E2E5EB" />
      <path d="M 10 77 L 46 77 L 46 80 L 10 80 Z" fill="#9EA3B0" />
      <path d="M 26 55 L 36 65 L 44 65 L 44 60 L 32 50 Z" fill="#DF6356" />
      <path d="M 88 72 C 88 62 82 58 74 55 L 66 50 L 60 50 C 58 50 56 52 56 55 L 56 72 Z" fill="#FFFFFF" />
      <rect x="54" y="72" width="36" height="8" rx="3" fill="#E2E5EB" />
      <path d="M 54 77 L 90 77 L 90 80 L 54 80 Z" fill="#9EA3B0" />
      <path d="M 74 55 L 64 65 L 56 65 L 56 60 L 68 50 Z" fill="#DF6356" />
    </svg>
  );
}
