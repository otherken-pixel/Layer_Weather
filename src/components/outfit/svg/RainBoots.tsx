interface Props {
  size?: number;
  className?: string;
}

export default function RainBoots({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Rain boots">
      <g transform="translate(8, 12)">
        <path d="M 18 10 Q 18 0 28 0 Q 38 0 38 10 L 38 38 L 18 38 Z" fill="#3375E0" />
        <path d="M 14 38 L 42 38 L 40 48 L 16 48 Z" fill="#255BAE" />
        <rect x="12" y="48" width="32" height="5" rx="2" fill="#1D2638" />
      </g>
      <g transform="translate(50, 12)">
        <path d="M 18 10 Q 18 0 28 0 Q 38 0 38 10 L 38 38 L 18 38 Z" fill="#3375E0" />
        <path d="M 14 38 L 42 38 L 40 48 L 16 48 Z" fill="#255BAE" />
        <rect x="12" y="48" width="32" height="5" rx="2" fill="#1D2638" />
      </g>
    </svg>
  );
}
