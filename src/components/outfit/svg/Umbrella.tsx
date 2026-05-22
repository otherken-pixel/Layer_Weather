interface Props {
  size?: number;
  className?: string;
}

export default function Umbrella({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Umbrella">
      <path d="M 48 45 L 48 70 A 6 6 0 0 0 58 70" stroke="#255BAE" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 20 45 Q 50 10 80 45 Z" fill="#3375E0" />
      <path d="M 40 45 Q 50 12 60 45 Z" fill="#77AAF1" />
      <rect x="48" y="10" width="4" height="6" fill="#3375E0" />
    </svg>
  );
}
