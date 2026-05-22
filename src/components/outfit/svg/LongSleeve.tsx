import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function LongSleeve({ className }: Props) {
  return (
    <OutfitIcon label="Long sleeve shirt" className={className}>
      <path
        d="M38 25c-8 0-13 3-21 13l7 7c4-5 8-10 11-13M62 25c8 0 13 3 21 13l-7 7c-4-5-8-10-11-13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M33 30c0 15 3 30 1 45h32c-2-15 1-30 1-45 0-4-3-5-7-5H40c-4 0-7 1-7 5z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M34 32v38M66 32v38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </OutfitIcon>
  );
}
