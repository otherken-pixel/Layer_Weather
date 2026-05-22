import { OutfitIcon } from "./OutfitIcon";

interface Props {
  className?: string;
}

export default function FlipFlops({ className }: Props) {
  return (
    <OutfitIcon label="Flip flops" className={className}>
      <g transform="translate(18, 15)">
        <path
          d="M15 0c15 0 17 20 10 40-5 20 0 30-10 30s-5-10-10-30C-2 20 0 0 15 0z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M5 35q10-20 10-20t10 20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(52, 15)">
        <path
          d="M15 0c15 0 17 20 10 40-5 20 0 30-10 30s-5-10-10-30C-2 20 0 0 15 0z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M5 35q10-20 10-20t10 20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </OutfitIcon>
  );
}
