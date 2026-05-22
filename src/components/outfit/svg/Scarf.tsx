interface Props {
  stroke?: string;
  size?: number;
  className?: string;
}

export default function Scarf({ stroke = "currentColor", size = 100, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Scarf"
    >
      {/* Main loop/knot area */}
      <path
        d="M26,44 Q24,24 50,20 Q76,24 74,44 Q74,60 50,62 Q26,60 26,44 Z"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Dangling left end */}
      <path
        d="M34,58 Q28,70 30,82 Q32,90 38,90 L44,90 Q48,90 48,86 L46,68"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Dangling right end */}
      <path
        d="M66,58 Q72,70 70,82 Q68,90 62,90 L56,90 Q52,90 52,86 L54,68"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Fringe lines on left end */}
      <line x1="37" y1="88" x2="37" y2="95" stroke={stroke} strokeWidth="1.5" />
      <line x1="41" y1="89" x2="41" y2="96" stroke={stroke} strokeWidth="1.5" />
      <line x1="45" y1="89" x2="45" y2="96" stroke={stroke} strokeWidth="1.5" />
      {/* Fringe lines on right end */}
      <line x1="55" y1="89" x2="55" y2="96" stroke={stroke} strokeWidth="1.5" />
      <line x1="59" y1="89" x2="59" y2="96" stroke={stroke} strokeWidth="1.5" />
      <line x1="63" y1="88" x2="63" y2="95" stroke={stroke} strokeWidth="1.5" />
      {/* Texture lines on the loop */}
      <path d="M36,36 Q50,30 64,36" stroke={stroke} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
