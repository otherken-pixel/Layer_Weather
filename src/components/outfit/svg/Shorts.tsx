interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Shorts({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Shorts"
    >
      {/* Outer silhouette — legs end at ~66% height, clearly short */}
      <path
        d="M20,18 L80,18 L80,24 L74,24 L68,62 Q68,66 64,66 L56,66 Q52,66 52,62 L50,50 L48,62 Q48,66 44,66 L36,66 Q32,66 32,62 L26,24 L20,24 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Waistband seam line */}
      <line x1="26" y1="26" x2="74" y2="26" stroke={stroke} strokeWidth="1.5" />
      {/* Center seam */}
      <path d="M50,28 L50,50" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Belt loops */}
      <rect x="30" y="16" width="5" height="10" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="47.5" y="16" width="5" height="10" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="65" y="16" width="5" height="10" rx="1" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
