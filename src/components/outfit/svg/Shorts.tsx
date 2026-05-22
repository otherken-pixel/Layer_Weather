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
      {/* Main shorts outline */}
      <path
        d="M22,22 L78,22 L78,26 L72,26 L66,72 Q66,76 62,76 L56,76 Q52,76 52,72 L50,58 L48,72 Q48,76 44,76 L38,76 Q34,76 34,72 L28,26 L22,26 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Waistband top line */}
      <line x1="22" y1="22" x2="78" y2="22" stroke={stroke} strokeWidth="2.5" />
      {/* Center seam */}
      <path d="M50,34 L50,58" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Belt loops */}
      <rect x="30" y="20" width="5" height="9" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="47.5" y="20" width="5" height="9" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="65" y="20" width="5" height="9" rx="1" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
