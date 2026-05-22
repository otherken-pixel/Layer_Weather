import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function RainJacket({ className }: Props) {
  return (
    <OutfitIcon label="Rain jacket" className={className}>
      <path
        d="M38 35c-8 0-13 3-21 13l7 7c4-5 8-10 11-13M62 35c8 0 13 3 21 13l-7 7c-4-5-8-10-11-13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 40c0 15 2 25 0 38q20 4 40 0c-2-13 0-23 0-38 0-5-5-8-10-8H41c-5 0-10 3-10 8z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M50 32v46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="28" r="14" stroke="currentColor" strokeWidth="2.5" />
    </OutfitIcon>
  );
}
