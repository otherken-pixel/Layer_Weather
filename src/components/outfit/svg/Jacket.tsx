interface Props {
  size?: number;
  className?: string;
}

export default function Jacket({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Light jacket">
      <path d="M 38 25 C 30 25 25 28 14 46 L 22 53 C 28 45 33 40 35 34 Z" fill="#55B5C4" />
      <path d="M 62 25 C 70 25 75 28 86 46 L 78 53 C 72 45 67 40 65 34 Z" fill="#55B5C4" />
      <path d="M 42 25 C 42 45 43 60 42 75 L 58 75 C 57 60 58 45 58 25 Z" fill="#FFFFFF" />
      <path d="M 33 30 C 33 45 36 60 34 75 L 44 75 C 43 60 44 45 44 25 L 40 25 C 36 25 33 26 33 30 Z" fill="#55B5C4" />
      <path d="M 67 30 C 67 45 64 60 66 75 L 56 75 C 57 60 56 45 56 25 L 60 25 C 64 25 67 26 67 30 Z" fill="#55B5C4" />
      <path d="M 41 25 C 41 45 42 60 41 75 L 44 75 C 43 60 44 45 44 25 Z" fill="#3E97A6" />
      <path d="M 59 25 C 59 45 58 60 59 75 L 56 75 C 57 60 56 45 56 25 Z" fill="#3E97A6" />
      <path d="M 42 20 Q 50 23 58 20 L 58 25 L 42 25 Z" fill="#3E97A6" />
    </svg>
  );
}
