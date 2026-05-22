interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Sunglasses({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Sunglasses"
    >
      {/* Left lens */}
      <path
        d="M4,42 Q4,34 12,34 L42,34 Q50,34 50,42 L50,58 Q50,66 42,66 L12,66 Q4,66 4,58 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Right lens */}
      <path
        d="M50,42 Q50,34 58,34 L88,34 Q96,34 96,42 L96,58 Q96,66 88,66 L58,66 Q50,66 50,58 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Nose bridge */}
      <path d="M42,50 Q46,46 50,50 Q54,46 58,50" stroke={stroke} strokeWidth="2" />
      {/* Left temple arm */}
      <line x1="4" y1="50" x2="-4" y2="46" stroke={stroke} strokeWidth="2" />
      {/* Right temple arm */}
      <line x1="96" y1="50" x2="104" y2="46" stroke={stroke} strokeWidth="2" />
      {/* Tinted lens hint */}
      <line x1="14" y1="48" x2="40" y2="48" stroke={stroke} strokeWidth="1" opacity="0.4" />
      <line x1="60" y1="48" x2="86" y2="48" stroke={stroke} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
