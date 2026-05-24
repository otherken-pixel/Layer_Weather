import type { ComponentType } from "react";

type SvgProps = { size?: number; className?: string };

const modules = import.meta.glob<{ default: ComponentType<SvgProps> }>(
  "./*.tsx",
  { eager: true }
);

export const svgRegistry: Record<string, ComponentType<SvgProps>> =
  Object.fromEntries(
    Object.entries(modules).map(([path, mod]) => [
      path.replace("./", "").replace(".tsx", ""),
      mod.default,
    ])
  );
