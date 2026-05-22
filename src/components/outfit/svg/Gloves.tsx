interface Props {
  size?: number;
  className?: string;
}

export default function Gloves({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Gloves">
      <g transform="translate(15, 20) rotate(-10)">
        <rect x="10" y="10" width="7" height="25" rx="3.5" fill="#2A3441" />
        <rect x="19" y="5" width="7" height="30" rx="3.5" fill="#2A3441" />
        <rect x="28" y="8" width="7" height="27" rx="3.5" fill="#2A3441" />
        <rect x="37" y="15" width="7" height="20" rx="3.5" fill="#2A3441" />
        <path d="M 10 35 L -2 25 A 4 4 0 0 0 -5 32 L 8 45 Z" fill="#2A3441" />
        <path d="M 10 30 L 44 30 L 40 60 L 12 60 Z" fill="#3A485A" />
        <rect x="10" y="60" width="32" height="12" rx="3" fill="#5B86C4" />
        <rect x="10" y="64" width="32" height="4" fill="#3375E0" />
      </g>
      <g transform="translate(55, 20) rotate(10)">
        <rect x="5" y="15" width="7" height="20" rx="3.5" fill="#2A3441" />
        <rect x="14" y="8" width="7" height="27" rx="3.5" fill="#2A3441" />
        <rect x="23" y="5" width="7" height="30" rx="3.5" fill="#2A3441" />
        <rect x="32" y="10" width="7" height="25" rx="3.5" fill="#2A3441" />
        <path d="M 39 35 L 51 25 A 4 4 0 0 1 54 32 L 41 45 Z" fill="#2A3441" />
        <path d="M 5 30 L 39 30 L 37 60 L 9 60 Z" fill="#3A485A" />
        <rect x="7" y="60" width="32" height="12" rx="3" fill="#5B86C4" />
        <rect x="7" y="64" width="32" height="4" fill="#3375E0" />
      </g>
    </svg>
  );
}
