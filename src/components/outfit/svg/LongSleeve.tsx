interface Props {
  size?: number;
  className?: string;
}

export default function LongSleeve({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Long sleeve shirt">
      <path d="M 38 25 C 30 25 25 28 14 46 L 22 53 C 28 45 33 40 35 34 Z" fill="#7A7FBE" />
      <path d="M 14 46 L 11 49 C 15 54 18 55 22 53 L 19 50 Z" fill="#5C5FA0" />
      <path d="M 62 25 C 70 25 75 28 86 46 L 78 53 C 72 45 67 40 65 34 Z" fill="#7A7FBE" />
      <path d="M 86 46 L 89 49 C 85 54 82 55 78 53 L 81 50 Z" fill="#5C5FA0" />
      <path d="M 33 30 C 33 45 36 60 34 75 L 66 75 C 64 60 67 45 67 30 C 67 26 64 25 60 25 L 40 25 C 36 25 33 26 33 30 Z" fill="#7A7FBE" />
      <path d="M 40 25 Q 50 38 60 25 L 55 25 Q 50 33 45 25 Z" fill="#5C5FA0" />
    </svg>
  );
}
