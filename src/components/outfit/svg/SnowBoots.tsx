interface Props {
  size?: number;
  className?: string;
}

export default function SnowBoots({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Snow boots">
      <g transform="translate(10, 14)">
        <path d="M 16 8 Q 16 0 24 0 Q 32 0 32 8 L 32 34 L 16 34 Z" fill="#77AAF1" />
        <rect x="12" y="34" width="24" height="10" rx="2" fill="#5B86C4" />
        <rect x="8" y="44" width="32" height="6" rx="2" fill="#3375E0" />
        <rect x="20" y="12" width="8" height="18" fill="#F1E678" opacity="0.85" />
      </g>
      <g transform="translate(52, 14)">
        <path d="M 16 8 Q 16 0 24 0 Q 32 0 32 8 L 32 34 L 16 34 Z" fill="#77AAF1" />
        <rect x="12" y="34" width="24" height="10" rx="2" fill="#5B86C4" />
        <rect x="8" y="44" width="32" height="6" rx="2" fill="#3375E0" />
        <rect x="20" y="12" width="8" height="18" fill="#F1E678" opacity="0.85" />
      </g>
    </svg>
  );
}
