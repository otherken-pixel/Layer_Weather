interface Props {
  size?: number;
  className?: string;
}

/** Closed-toe sneakers — below 85°F when dry */
export default function Sneakers({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Sneakers">
      <g transform="translate(10, 48)">
        <path d="M 6 18 Q 6 4 18 4 Q 28 4 32 14 L 36 18 Q 38 22 34 26 L 8 26 Q 4 22 6 18 Z" fill="#3375E0" />
        <path d="M 4 26 L 38 26 L 36 32 L 6 32 Z" fill="#255BAE" />
        <rect x="14" y="10" width="12" height="4" rx="1" fill="#77AAF1" />
      </g>
      <g transform="translate(52, 48)">
        <path d="M 6 18 Q 6 4 18 4 Q 28 4 32 14 L 36 18 Q 38 22 34 26 L 8 26 Q 4 22 6 18 Z" fill="#3375E0" />
        <path d="M 4 26 L 38 26 L 36 32 L 6 32 Z" fill="#255BAE" />
        <rect x="14" y="10" width="12" height="4" rx="1" fill="#77AAF1" />
      </g>
    </svg>
  );
}
