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
      {/* Waistband */}
      <path
        d="M22,16 L78,16 L78,22 L72,22 L66,90 Q66,94 62,94 L56,94 Q52,94 52,90 L50,72 L48,90 Q48,94 44,94 L38,94 Q34,94 34,90 L28,22 L22,22 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Center seam */}
      <path d="M50,28 L50,72" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Belt loops */}
      <rect x="30" y="14" width="5" height="9" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="47.5" y="14" width="5" height="9" rx="1" stroke={stroke} strokeWidth="1.5" />
      <rect x="65" y="14" width="5" height="9" rx="1" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
