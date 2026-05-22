interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function TShirt({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="T-shirt"
    >
      {/* Main body + sleeves */}
      <path
        d="M22,22 L8,16 Q4,26 10,34 L24,28 L24,86 Q24,90 28,90 L72,90 Q76,90 76,86 L76,28 L90,34 Q96,26 92,16 L78,22 L68,14 Q60,10 50,10 Q40,10 32,14 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Crew neck opening */}
      <path
        d="M34,18 Q50,28 66,18"
        stroke={stroke}
        strokeWidth="2"
      />
    </svg>
  );
}
