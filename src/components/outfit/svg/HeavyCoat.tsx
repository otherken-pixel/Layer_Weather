interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function HeavyCoat({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Heavy coat"
    >
      {/* Long coat body + wide sleeves */}
      <path
        d="M18,24 L4,14 Q0,28 6,38 L20,32 L20,94 Q20,98 25,98 L75,98 Q80,98 80,94 L80,32 L94,38 Q100,28 96,14 L82,24 L72,10 Q62,4 50,6 Q38,4 28,10 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Left lapel - wide collar/lapel */}
      <path d="M34,10 L40,38 L50,34" stroke={stroke} strokeWidth="2" />
      {/* Right lapel */}
      <path d="M66,10 L60,38 L50,34" stroke={stroke} strokeWidth="2" />
      {/* Button placket */}
      <line x1="50" y1="34" x2="50" y2="98" stroke={stroke} strokeWidth="1.5" />
      {/* Buttons */}
      <circle cx="50" cy="46" r="2.5" stroke={stroke} strokeWidth="1.5" />
      <circle cx="50" cy="58" r="2.5" stroke={stroke} strokeWidth="1.5" />
      <circle cx="50" cy="70" r="2.5" stroke={stroke} strokeWidth="1.5" />
      <circle cx="50" cy="82" r="2.5" stroke={stroke} strokeWidth="1.5" />
      {/* Pocket lines */}
      <path d="M28,62 L38,62 L38,74 Q38,76 36,76 L30,76 Q28,76 28,74 Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M72,62 L62,62 L62,74 Q62,76 64,76 L70,76 Q72,76 72,74 Z" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
