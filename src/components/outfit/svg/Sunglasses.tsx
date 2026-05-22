interface Props {
  size?: number;
  className?: string;
}

export default function Sunglasses({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Sunglasses">
      <rect x="25" y="40" width="22" height="16" rx="4" fill="#3A4048" />
      <rect x="53" y="40" width="22" height="16" rx="4" fill="#3A4048" />
      <rect x="47" y="45" width="6" height="3" fill="#3A4048" />
      <rect x="15" y="42" width="10" height="4" fill="#3A4048" />
      <rect x="75" y="42" width="10" height="4" fill="#3A4048" />
      <rect x="28" y="42" width="16" height="4" fill="#58606B" />
      <rect x="56" y="42" width="16" height="4" fill="#58606B" />
    </svg>
  );
}
