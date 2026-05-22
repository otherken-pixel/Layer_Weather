interface Props {
  size?: number;
  className?: string;
}

export default function RainJacket({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Rain jacket">
      <path d="M 38 35 C 30 35 25 38 14 56 L 22 63 C 28 55 33 50 35 44 Z" fill="#3375E0" />
      <path d="M 62 35 C 70 35 75 38 86 56 L 78 63 C 72 55 67 50 65 44 Z" fill="#3375E0" />
      <path d="M 31 40 C 31 55 33 65 30 78 Q 50 82 70 78 C 67 65 69 55 69 40 C 69 35 65 32 60 32 L 40 32 C 35 32 31 35 31 40 Z" fill="#3375E0" />
      <rect x="48" y="32" width="4" height="46" fill="#255BAE" />
      <circle cx="50" cy="28" r="16" fill="#3375E0" />
      <circle cx="50" cy="30" r="11" fill="#1D2638" />
    </svg>
  );
}
