import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function Shorts({ className }: Props) {
  return (
    <OutfitIcon label="Shorts" className={className}>
      <path d="M28 30h44v8H28z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path
        d="M28 38l20 0v22l-18 0 2-22M52 38h20l-2 22H52V38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </OutfitIcon>
  );
}
