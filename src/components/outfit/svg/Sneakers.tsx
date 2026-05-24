interface Props {
  size?: number;
  className?: string;
}

/** Closed-toe sneakers — below 85°F when dry */
export default function Sneakers({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Sneakers">
      {/* Sole */}
      <path d="M 8 72 L 92 72 Q 94 72 94 75 L 94 80 Q 94 83 91 83 L 8 83 Q 5 83 5 80 L 5 75 Q 5 72 8 72 Z" fill="#E2E5EB" />
      {/* Midsole accent line */}
      <rect x="5" y="76" width="89" height="3" fill="#9EA3B0" />
      {/* Upper body */}
      <path d="M 12 72 L 12 48 Q 13 40 22 38 L 46 36 Q 52 35 55 38 L 72 55 L 88 62 Q 92 64 92 68 L 92 72 Z" fill="#FFFFFF" />
      {/* Toe box curve */}
      <path d="M 5 72 L 5 66 Q 6 58 12 55 L 12 72 Z" fill="#ECECEC" />
      {/* Tongue */}
      <path d="M 38 38 L 45 36 L 50 37 L 52 48 L 38 50 Z" fill="#F0F0F0" />
      {/* Swoosh-style accent stripe */}
      <path d="M 20 60 Q 38 48 62 52 L 72 55 Q 50 50 28 64 Z" fill="#DF6356" />
      {/* Collar opening */}
      <path d="M 12 48 Q 13 40 22 38 L 38 38 L 38 50 L 12 50 Z" fill="#E8E8E8" />
      {/* Lace eyelets row */}
      <circle cx="30" cy="43" r="2" fill="#CCCCCC" />
      <circle cx="36" cy="41" r="2" fill="#CCCCCC" />
      <circle cx="42" cy="39.5" r="2" fill="#CCCCCC" />
      {/* Laces */}
      <path d="M 30 43 L 36 41 M 36 41 L 42 39.5" stroke="#DDDDDD" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Heel tab */}
      <path d="M 88 62 Q 94 63 94 68 L 94 72 L 88 72 Z" fill="#ECECEC" />
      <rect x="89" y="64" width="3" height="6" rx="1" fill="#DF6356" />
    </svg>
  );
}
