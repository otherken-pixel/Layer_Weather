interface Props {
  stroke?: string;
  size?: number;
  className?: string;
  rainActive?: boolean;
}

export default function RainJacket({ stroke = "currentColor", size = 100, className, rainActive }: Props) {
  const activeStroke = rainActive ? "#007AFF" : stroke;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Rain jacket"
    >
      {/* Hood */}
      <path
        d="M34,18 Q32,4 50,2 Q68,4 66,18"
        stroke={activeStroke}
        strokeWidth="2.5"
      />
      {/* Hood drawstring */}
      <path d="M36,10 Q50,14 64,10" stroke={activeStroke} strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Main body + sleeves */}
      <path
        d="M22,26 L8,18 Q4,30 10,38 L24,32 L24,86 Q24,90 28,90 L72,90 Q76,90 76,86 L76,32 L90,38 Q96,30 92,18 L78,26 L68,18 Q60,14 50,16 Q40,14 32,18 Z"
        stroke={activeStroke}
        strokeWidth="2.5"
      />
      {/* Zipper */}
      <line x1="50" y1="26" x2="50" y2="90" stroke={activeStroke} strokeWidth="2" />
      {/* Zipper pull */}
      <rect x="47" y="34" width="6" height="8" rx="2" stroke={activeStroke} strokeWidth="1.5" />
      {/* Storm flap over zipper */}
      <path d="M50,26 L57,26 L57,90" stroke={activeStroke} strokeWidth="1" strokeDasharray="4 3" />
      {/* Cuff details */}
      <path d="M10,36 L24,32" stroke={activeStroke} strokeWidth="2" />
      <path d="M76,32 L90,36" stroke={activeStroke} strokeWidth="2" />
      {/* Hem band */}
      <line x1="24" y1="84" x2="76" y2="84" stroke={activeStroke} strokeWidth="1.5" />
    </svg>
  );
}
