interface Props {
  size?: number;
  className?: string;
}

export default function SnowBoots({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Snow boots">
      <path d="M 24 30 L 40 30 L 40 60 L 24 60 Z" fill="#5B86C4" />
      <path d="M 12 60 L 40 60 L 42 80 L 10 80 C 10 70 10 65 12 60 Z" fill="#2A3441" />
      <rect x="8" y="76" width="36" height="8" rx="2" fill="#1D2638" />
      <rect x="21" y="20" width="22" height="12" rx="5" fill="#FFFFFF" />
      <line x1="24" y1="40" x2="40" y2="40" stroke="#1D2638" strokeWidth="2" />
      <line x1="24" y1="50" x2="40" y2="50" stroke="#1D2638" strokeWidth="2" />
      <path d="M 60 30 L 76 30 L 76 60 L 60 60 Z" fill="#5B86C4" />
      <path d="M 60 60 L 88 60 C 90 65 90 70 90 80 L 58 80 L 60 60 Z" fill="#2A3441" />
      <rect x="56" y="76" width="36" height="8" rx="2" fill="#1D2638" />
      <rect x="57" y="20" width="22" height="12" rx="5" fill="#FFFFFF" />
      <line x1="60" y1="40" x2="76" y2="40" stroke="#1D2638" strokeWidth="2" />
      <line x1="60" y1="50" x2="76" y2="50" stroke="#1D2638" strokeWidth="2" />
    </svg>
  );
}
