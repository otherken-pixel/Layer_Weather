import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function Beanie({ className }: Props) {
  return (
    <OutfitIcon label="Beanie" className={className}>
      <circle cx="50" cy="25" r="7" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M30 60q0-30 20-30t20 30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M26 60h48v12H26z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </OutfitIcon>
  );
}
