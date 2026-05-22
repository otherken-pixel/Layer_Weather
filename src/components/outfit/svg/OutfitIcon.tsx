import type { SVGProps } from "react";

interface Props extends SVGProps<SVGSVGElement> {
  label: string;
}

export function OutfitIcon({ label, className, children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={label}
      {...props}
    >
      {children}
    </svg>
  );
}
