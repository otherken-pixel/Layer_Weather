interface Props {
  size?: number;
  className?: string;
}

export default function Pants({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Pants">
      <rect x="30" y="20" width="40" height="10" fill="#255BAE" />
      <polygon points="30,30 48,30 48,80 32,80" fill="#3375E0" />
      <polygon points="52,30 70,30 68,80 52,80" fill="#3375E0" />
      <polygon points="32,30 38,30 38,45 32,40" fill="#255BAE" />
      <polygon points="68,30 62,30 62,45 68,40" fill="#255BAE" />
    </svg>
  );
}
