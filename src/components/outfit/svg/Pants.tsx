interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Pants({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Pants"
    >
      {/* Outer silhouette — legs go full length to ~92% height, clearly long */}
      <path
        d="M20,12 L80,12 L80,18 L76,18 L68,90 Q68,94 64,94 L56,94 Q52,94 52,90 L50,72 L48,90 Q48,94 44,94 L36,94 Q32,94 32,90 L24,18 L20,18 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Waistband seam */}
      <line x1="24" y1="20" x2="76" y2="20" stroke={stroke} strokeWidth="1.5" />
      {/* Center seam */}
      <path d="M50,24 L50,72" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Belt loops */}
      <rect x="30" y="10" width="5" height="10" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="47.5" y="10" width="5" height="10" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="65" y="10" width="5" height="10" rx="1" stroke={stroke} strokeWidth="1.5" />
      {/* Front crease lines */}
      <line x1="38" y1="24" x2="36" y2="90" stroke={stroke} strokeWidth="1" opacity="0.5" />
      <line x1="62" y1="24" x2="64" y2="90" stroke={stroke} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
