import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function Umbrella({ className }: Props) {
  return (
    <OutfitIcon label="Umbrella" className={className}>
      <path
        d="M20 45q30-35 60 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M48 45v25a6 6 0 0 0 10 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M48 10v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </OutfitIcon>
  );
}
