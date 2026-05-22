import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function RainBoots({ className }: Props) {
  return (
    <OutfitIcon label="Rain boots" className={className}>
      <g transform="translate(14, 16)">
        <path
          d="M20 12c0-8 6-12 12-12s12 4 12 12v32H20V12z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M16 44h32l-2 8H18l-2-8z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M14 52h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g transform="translate(50, 16)">
        <path
          d="M20 12c0-8 6-12 12-12s12 4 12 12v32H20V12z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M16 44h32l-2 8H18l-2-8z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M14 52h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </OutfitIcon>
  );
}
