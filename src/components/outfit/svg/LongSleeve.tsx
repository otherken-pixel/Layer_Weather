interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function LongSleeve({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Long-sleeve shirt"
    >
      {/* Outer silhouette — sleeves extend to ~82% height, clearly long */}
      <path
        d="M36,12 L20,18 L4,20 L4,82 L20,80 L20,90 Q20,94 24,94 L76,94 Q80,94 80,90 L80,80 L96,82 L96,20 L80,18 L64,12 Q56,24 50,26 Q44,24 36,12 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Inner neckband */}
      <path d="M38,16 Q50,24 62,16" stroke={stroke} strokeWidth="1.5" />
      {/* Cuff bands at wrist */}
      <line x1="4" y1="76" x2="20" y2="74" stroke={stroke} strokeWidth="1.5" />
      <line x1="80" y1="74" x2="96" y2="76" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
