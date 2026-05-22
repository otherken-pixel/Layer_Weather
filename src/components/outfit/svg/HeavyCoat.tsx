interface Props {
  size?: number;
  className?: string;
}

export default function HeavyCoat({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Winter coat">
      <path d="M 38 25 C 28 25 22 28 12 46 L 20 55 C 28 45 33 40 35 34 Z" fill="#77AAF1" />
      <path d="M 12 46 L 9 50 C 14 56 18 57 22 54 L 20 51 Z" fill="#F1E678" />
      <path d="M 62 25 C 72 25 78 28 88 46 L 80 55 C 72 45 67 40 65 34 Z" fill="#77AAF1" />
      <path d="M 88 46 L 91 50 C 86 56 82 57 78 54 L 80 51 Z" fill="#F1E678" />
      <path d="M 28 35 C 27 45 30 60 28 75 L 72 75 C 70 60 73 45 72 35 C 72 30 65 25 60 25 L 40 25 C 35 25 28 30 28 35 Z" fill="#77AAF1" />
      <path d="M 28 42 Q 50 48 72 42 L 72 46 Q 50 52 28 46 Z" fill="#5B86C4" />
      <path d="M 28 57 Q 50 63 72 57 L 72 61 Q 50 67 28 61 Z" fill="#5B86C4" />
      <path d="M 28 71 Q 50 76 72 71 L 72 75 L 28 75 Z" fill="#F1E678" />
      <rect x="38" y="15" width="24" height="10" rx="4" fill="#5B86C4" />
      <rect x="48" y="25" width="4" height="48" rx="1" fill="#5B86C4" />
    </svg>
  );
}
