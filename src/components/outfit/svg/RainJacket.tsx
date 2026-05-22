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
      {/* Hood outer arc — large drooping dome matching Shutterstock anorak style */}
      <path
        d="M28,32 Q26,2 50,2 Q74,2 72,32"
        stroke={activeStroke}
        strokeWidth="2.5"
      />
      {/* Hood inner opening — shows hood depth/opening */}
      <path
        d="M30,32 Q30,14 50,14 Q70,14 70,32"
        stroke={activeStroke}
        strokeWidth="1.5"
      />
      {/* Jacket body + sleeves, collar curves connect to hood base */}
      <path
        d="M22,34 L6,28 L6,58 L22,52 L22,88 Q22,92 26,92 L74,92 Q78,92 78,88 L78,52 L94,58 L94,28 L78,34 L72,32 Q60,36 50,36 Q40,36 28,32 Z"
        stroke={activeStroke}
        strokeWidth="2.5"
      />
      {/* Front zipper */}
      <line x1="50" y1="36" x2="50" y2="92" stroke={activeStroke} strokeWidth="2" />
      {/* Zipper pull */}
      <rect x="47" y="46" width="6" height="8" rx="2" stroke={activeStroke} strokeWidth="1.5" />
      {/* Cuff bands */}
      <line x1="6" y1="54" x2="22" y2="48" stroke={activeStroke} strokeWidth="1.5" />
      <line x1="78" y1="48" x2="94" y2="54" stroke={activeStroke} strokeWidth="1.5" />
      {/* Pockets */}
      <path d="M28,64 L28,78 L42,78 L42,64" stroke={activeStroke} strokeWidth="1.5" />
      <path d="M72,64 L72,78 L58,78 L58,64" stroke={activeStroke} strokeWidth="1.5" />
    </svg>
  );
}
