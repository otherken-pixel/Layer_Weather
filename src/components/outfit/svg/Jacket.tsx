interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Jacket({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Light jacket"
    >
      {/* Main body + sleeves */}
      <path
        d="M20,24 L6,16 Q2,28 8,36 L22,30 L22,86 Q22,90 26,90 L74,90 Q78,90 78,86 L78,30 L92,36 Q98,28 94,16 L80,24 L70,12 Q60,6 50,8 Q40,6 30,12 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Left lapel */}
      <path d="M38,12 L44,34 L50,30" stroke={stroke} strokeWidth="2" />
      {/* Right lapel */}
      <path d="M62,12 L56,34 L50,30" stroke={stroke} strokeWidth="2" />
      {/* Zipper line */}
      <line x1="50" y1="30" x2="50" y2="90" stroke={stroke} strokeWidth="1.5" strokeDasharray="5 3" />
      {/* Cuff lines */}
      <path d="M8,34 L22,30" stroke={stroke} strokeWidth="1.5" />
      <path d="M78,30 L92,34" stroke={stroke} strokeWidth="1.5" />
      {/* Hem band */}
      <line x1="22" y1="84" x2="78" y2="84" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
