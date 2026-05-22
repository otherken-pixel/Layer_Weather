interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Sneakers({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Sneakers"
    >
      {/* Sole */}
      <path
        d="M8,76 Q8,84 16,86 L82,86 Q94,86 94,78 Q94,70 86,68 L82,68"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Upper body of shoe */}
      <path
        d="M16,68 L16,52 Q16,38 28,30 Q40,22 54,22 Q68,22 78,32 Q88,42 88,68"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Toe cap detail */}
      <path d="M16,52 Q12,42 20,34" stroke={stroke} strokeWidth="1.5" />
      {/* Heel counter */}
      <path d="M82,68 Q90,62 88,50" stroke={stroke} strokeWidth="1.5" />
      {/* Lace flap (vamp) */}
      <path
        d="M36,28 L36,58 Q36,64 42,64 L76,64 Q82,62 82,56 L80,36"
        stroke={stroke}
        strokeWidth="2"
      />
      {/* Laces */}
      <line x1="40" y1="38" x2="78" y2="42" stroke={stroke} strokeWidth="1.5" />
      <line x1="40" y1="48" x2="78" y2="52" stroke={stroke} strokeWidth="1.5" />
      <line x1="40" y1="58" x2="76" y2="60" stroke={stroke} strokeWidth="1.5" />
      {/* Side stripe (brand detail) */}
      <path d="M20,60 Q38,52 60,56 Q72,58 80,64" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
