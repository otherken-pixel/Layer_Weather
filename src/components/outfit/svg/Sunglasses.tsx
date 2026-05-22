import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function Sunglasses({ className }: Props) {
  return (
    <OutfitIcon label="Sunglasses" className={className}>
      <rect x="22" y="42" width="24" height="14" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <rect x="54" y="42" width="24" height="14" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M46 48h8M14 44h8M78 44h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </OutfitIcon>
  );
}
