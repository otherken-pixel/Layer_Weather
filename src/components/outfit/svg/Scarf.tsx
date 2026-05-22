interface Props {
  size?: number;
  className?: string;
}

export default function Scarf({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Scarf">
      <rect x="52" y="45" width="14" height="35" rx="2" fill="#B33B34" />
      <rect x="52" y="55" width="14" height="6" fill="#FFFFFF" />
      <rect x="52" y="67" width="14" height="6" fill="#FFFFFF" />
      <rect x="34" y="40" width="16" height="42" rx="2" fill="#D34E45" />
      <rect x="34" y="50" width="16" height="7" fill="#FFFFFF" />
      <rect x="34" y="64" width="16" height="7" fill="#FFFFFF" />
      <path d="M 28 35 C 28 20 72 20 72 35 C 72 45 28 48 28 35 Z" fill="#D34E45" />
      <path d="M 40 22 L 45 46 L 55 45 L 50 21 Z" fill="#FFFFFF" />
      <path d="M 60 25 L 63 42 L 70 38 L 68 23 Z" fill="#FFFFFF" />
      <path d="M 30 28 L 32 40 L 38 42 L 35 25 Z" fill="#FFFFFF" />
      <line x1="36" y1="82" x2="36" y2="90" stroke="#D34E45" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="82" x2="42" y2="90" stroke="#D34E45" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="82" x2="48" y2="90" stroke="#D34E45" strokeWidth="2" strokeLinecap="round" />
      <line x1="55" y1="80" x2="55" y2="86" stroke="#B33B34" strokeWidth="2" strokeLinecap="round" />
      <line x1="63" y1="80" x2="63" y2="86" stroke="#B33B34" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
