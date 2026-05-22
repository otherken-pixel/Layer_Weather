import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function Pants({ className }: Props) {
  return (
    <OutfitIcon label="Pants" className={className}>
      <path d="M30 20h40v10H30z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path
        d="M30 30l18 0v50l-16 0 2-50M52 30h18l-2 50H52V30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </OutfitIcon>
  );
}
