interface Props {
  size?: number;
  className?: string;
}

export default function Sneakers({ size = 100, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label="Flip flops">
      <g transform="translate(18, 15)">
        <path d="M 15 0 C 30 0 32 20 25 40 C 20 60 25 70 15 70 C 5 70 10 60 5 40 C -2 20 0 0 15 0 Z" fill="#77AAF1" />
        <path d="M 5 35 Q 15 15 15 15 Q 15 15 25 35" fill="none" stroke="#255BAE" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="15" r="3" fill="#1D2638" />
      </g>
      <g transform="translate(52, 15)">
        <path d="M 15 0 C 0 0 -2 20 5 40 C 10 60 5 70 15 70 C 25 70 20 60 25 40 C 32 20 30 0 15 0 Z" fill="#77AAF1" />
        <path d="M 5 35 Q 15 15 15 15 Q 15 15 25 35" fill="none" stroke="#255BAE" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="15" r="3" fill="#1D2638" />
      </g>
    </svg>
  );
}
