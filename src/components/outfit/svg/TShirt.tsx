interface Props {
  size?: number;
  className?: string;
}

export default function TShirt({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Short sleeve shirt">
      <path d="M 38 25 C 30 25 25 28 17 38 L 24 45 C 28 40 32 35 35 32 Z" fill="#DF6356" />
      <path d="M 17 38 L 15 41 L 22 48 L 24 45 Z" fill="#DE8B51" />
      <path d="M 62 25 C 70 25 75 28 83 38 L 76 45 C 72 40 68 35 65 32 Z" fill="#DF6356" />
      <path d="M 83 38 L 85 41 L 78 48 L 76 45 Z" fill="#DE8B51" />
      <path d="M 33 30 C 33 45 36 60 34 75 L 66 75 C 64 60 67 45 67 30 C 67 26 64 25 60 25 L 40 25 C 36 25 33 26 33 30 Z" fill="#DF6356" />
      <path d="M 40 25 Q 50 38 60 25 L 55 25 Q 50 33 45 25 Z" fill="#DE8B51" />
    </svg>
  );
}
