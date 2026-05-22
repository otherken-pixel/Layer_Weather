import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function Scarf({ className }: Props) {
  return (
    <OutfitIcon label="Scarf" className={className}>
      <path
        d="M28 35c0-15 44-15 44 0 0 10-44 13-44 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M34 40v42M52 45v35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 52h16M34 66h16M52 55h14M52 67h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </OutfitIcon>
  );
}
