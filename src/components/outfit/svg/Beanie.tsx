interface Props {
  size?: number;
  className?: string;
}

export default function Beanie({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Beanie">
      <circle cx="50" cy="25" r="8" fill="#77AAF1" />
      <path d="M 30 60 Q 30 30 50 30 Q 70 30 70 60 Z" fill="#5B86C4" />
      <rect x="26" y="60" width="48" height="15" rx="3" fill="#3375E0" />
      <rect x="32" y="60" width="4" height="15" fill="#255BAE" />
      <rect x="42" y="60" width="4" height="15" fill="#255BAE" />
      <rect x="54" y="60" width="4" height="15" fill="#255BAE" />
      <rect x="64" y="60" width="4" height="15" fill="#255BAE" />
    </svg>
  );
}
