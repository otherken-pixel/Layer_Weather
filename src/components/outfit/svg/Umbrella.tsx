interface Props {
  stroke?: string;
  size?: number;
  className?: string;
  rainActive?: boolean;
}

export default function Umbrella({ stroke = "currentColor", size = 100, className, rainActive }: Props) {
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
      aria-label="Umbrella"
    >
      {/* Canopy */}
      <path
        d="M12,52 Q14,18 50,14 Q86,18 88,52 Z"
        stroke={activeStroke}
        strokeWidth="2.5"
      />
      {/* Center rib */}
      <line x1="50" y1="14" x2="50" y2="52" stroke={activeStroke} strokeWidth="1.5" />
      {/* Left ribs */}
      <line x1="50" y1="14" x2="22" y2="48" stroke={activeStroke} strokeWidth="1.5" />
      <line x1="50" y1="14" x2="36" y2="52" stroke={activeStroke} strokeWidth="1.5" />
      {/* Right ribs */}
      <line x1="50" y1="14" x2="78" y2="48" stroke={activeStroke} strokeWidth="1.5" />
      <line x1="50" y1="14" x2="64" y2="52" stroke={activeStroke} strokeWidth="1.5" />
      {/* Handle/shaft */}
      <path d="M50,52 L50,86 Q50,94 42,94 Q34,94 34,86" stroke={activeStroke} strokeWidth="2.5" />
    </svg>
  );
}
