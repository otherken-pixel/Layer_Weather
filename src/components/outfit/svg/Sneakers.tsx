import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

/** Closed-toe sneakers — below 85°F when dry (no snow/rain) */
export default function Sneakers({ className }: Props) {
  return (
    <OutfitIcon label="Sneakers" className={className}>
      <g transform="translate(14, 52)">
        <path
          d="M4 14h26c2 0 4-2 4-5 0-8-6-14-14-14S6 1 4 9c0 3 0 5 0 5z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M8 14v4M20 14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(52, 52)">
        <path
          d="M4 14h26c2 0 4-2 4-5 0-8-6-14-14-14S6 1 4 9c0 3 0 5 0 5z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M8 14v4M20 14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </OutfitIcon>
  );
}
