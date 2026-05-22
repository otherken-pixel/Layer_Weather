interface Props {
  size?: number;
  className?: string;
}

export default function Shorts({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Shorts">
      <rect x="28" y="30" width="44" height="8" fill="#255BAE" />
      <polygon points="28,38 48,38 48,60 30,60" fill="#3375E0" />
      <polygon points="52,38 72,38 70,60 52,60" fill="#3375E0" />
      <rect x="30" y="60" width="18" height="10" fill="#77AAF1" />
      <rect x="52" y="60" width="18" height="10" fill="#77AAF1" />
    </svg>
  );
}
