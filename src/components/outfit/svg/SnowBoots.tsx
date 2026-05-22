import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function SnowBoots({ className }: Props) {
  return (
    <OutfitIcon label="Snow boots" className={className}>
      <g transform="translate(12, 18)">
        <path
          d="M18 8c0-6 4-10 8-10s8 4 8 10v28H18V8z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M14 36h20v8H14z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M12 44h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 20v12M30 20v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(52, 18)">
        <path
          d="M18 8c0-6 4-10 8-10s8 4 8 10v28H18V8z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M14 36h20v8H14z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M12 44h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 20v12M30 20v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </OutfitIcon>
  );
}
