interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function TShirt({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="T-shirt"
    >
      {/* Outer silhouette — sleeves end at ~42% height, clearly short */}
      <path
        d="M36,12 L20,18 L4,22 L4,42 L20,36 L20,90 Q20,94 24,94 L76,94 Q80,94 80,90 L80,36 L96,42 L96,22 L80,18 L64,12 Q56,24 50,26 Q44,24 36,12 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Inner neckband */}
      <path d="M38,16 Q50,24 62,16" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
