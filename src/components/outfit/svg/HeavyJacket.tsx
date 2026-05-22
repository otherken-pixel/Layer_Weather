import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function HeavyJacket({ className }: Props) {
  return (
    <OutfitIcon label="Heavy jacket" className={className}>
      <path
        d="M38 25c-8 0-13 3-21 13l7 7c4-5 8-10 11-13M62 25c8 0 13 3 21 13l-7 7c-4-5-8-10-11-13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 32c0 13 2 28 0 43h38c-2-15 0-30 0-43 0-5-4-7-8-7H39c-4 0-8 2-8 7z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M50 25v48M38 25h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 55h8v12h-8zM58 55h8v12h-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </OutfitIcon>
  );
}
