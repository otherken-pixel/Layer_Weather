interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Beanie({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Beanie"
    >
      {/* Pom-pom */}
      <circle cx="50" cy="14" r="8" stroke={stroke} strokeWidth="2.5" />
      {/* Dome of hat */}
      <path
        d="M18,56 Q16,22 50,18 Q84,22 82,56"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Folded brim band */}
      <path
        d="M16,56 L84,56 Q86,70 84,72 L16,72 Q14,70 16,56 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Ribbing lines on brim */}
      <line x1="24" y1="56" x2="24" y2="72" stroke={stroke} strokeWidth="1.5" />
      <line x1="32" y1="56" x2="32" y2="72" stroke={stroke} strokeWidth="1.5" />
      <line x1="40" y1="56" x2="40" y2="72" stroke={stroke} strokeWidth="1.5" />
      <line x1="50" y1="56" x2="50" y2="72" stroke={stroke} strokeWidth="1.5" />
      <line x1="60" y1="56" x2="60" y2="72" stroke={stroke} strokeWidth="1.5" />
      <line x1="68" y1="56" x2="68" y2="72" stroke={stroke} strokeWidth="1.5" />
      <line x1="76" y1="56" x2="76" y2="72" stroke={stroke} strokeWidth="1.5" />
      {/* Pom-pom texture */}
      <circle cx="50" cy="14" r="4" stroke={stroke} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
