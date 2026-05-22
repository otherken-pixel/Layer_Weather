interface Props {
  size?: number;
  className?: string;
}

export default function HeavyJacket({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Heavy jacket">
      <path d="M 38 25 C 30 25 25 28 14 46 L 22 53 C 28 45 33 40 35 34 Z" fill="#575DB6" />
      <path d="M 62 25 C 70 25 75 28 86 46 L 78 53 C 72 45 67 40 65 34 Z" fill="#575DB6" />
      <path d="M 31 32 C 31 45 33 60 32 75 L 68 75 C 67 60 69 45 69 32 C 69 28 65 25 60 25 L 40 25 C 35 25 31 28 31 32 Z" fill="#575DB6" />
      <rect x="46" y="25" width="8" height="50" rx="1" fill="#434898" />
      <rect x="34" y="55" width="10" height="12" rx="2" fill="#434898" />
      <rect x="56" y="55" width="10" height="12" rx="2" fill="#434898" />
      <path d="M 38 25 Q 50 15 62 25 Z" fill="#434898" />
    </svg>
  );
}
