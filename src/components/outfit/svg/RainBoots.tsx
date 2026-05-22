interface Props {
  size?: number;
  className?: string;
}

export default function RainBoots({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Rain boots">
      <path d="M 24 25 L 40 25 L 40 76 L 12 76 C 12 65 20 60 24 55 Z" fill="#F2C94C" />
      <rect x="10" y="76" width="32" height="6" rx="2" fill="#2A3441" />
      <rect x="22" y="22" width="20" height="6" rx="3" fill="#D4A220" />
      <rect x="36" y="35" width="4" height="12" rx="1" fill="#D4A220" />
      <path d="M 60 25 L 76 25 L 76 55 C 80 60 88 65 88 76 L 60 76 Z" fill="#F2C94C" />
      <rect x="58" y="76" width="32" height="6" rx="2" fill="#2A3441" />
      <rect x="58" y="22" width="20" height="6" rx="3" fill="#D4A220" />
      <rect x="60" y="35" width="4" height="12" rx="1" fill="#D4A220" />
    </svg>
  );
}
