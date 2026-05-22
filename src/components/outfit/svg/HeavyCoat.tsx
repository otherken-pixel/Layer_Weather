import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function HeavyCoat({ className }: Props) {
  return (
    <OutfitIcon label="Winter coat" className={className}>
      <path
        d="M38 25c-10 0-16 3-26 13l8 9c6-8 11-13 14-16M62 25c10 0 16 3 26 13l-8 9c-6-8-11-13-14-16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 35c0 13 2 28 0 43h44c-2-15 0-30 0-43 0-5-5-10-8-15-8H43c-5 0-10 3-15 8z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M28 42h44M28 57h44M28 71h44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 15h24v10H38zM50 25v48" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </OutfitIcon>
  );
}
