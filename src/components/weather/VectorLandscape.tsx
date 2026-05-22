import React from "react";

interface Props {
  skyColor: string;
  isDay: boolean;
}

export function VectorLandscape({ skyColor, isDay }: Props) {
  const hills = isDay
    ? { far: "#52B788", mid: "#40916C", front: "#2D6A4F" }
    : { far: "#1B3A2B", mid: "#142A1F", front: "#0D1F16" };

  const trees = isDay
    ? { canopy: "#1B4332", mid: "#2D6A4F", trunk: "#1B2A22" }
    : { canopy: "#080F0A", mid: "#0D1F16", trunk: "#060C08" };

  return (
    <svg
      viewBox="0 0 375 120"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "120px", display: "block", flexShrink: 0 }}
    >
      <rect width="375" height="120" fill={skyColor} />

      {/* Hill 1 — far background */}
      <path
        d="M0,85 C40,60 80,50 120,55 C160,60 190,75 230,68 C270,61 310,48 375,58 L375,120 L0,120 Z"
        fill={hills.far} opacity="0.55"
      />

      {/* Hill 2 — mid */}
      <path
        d="M0,98 C30,78 70,68 110,76 C150,84 180,73 220,78 C260,83 300,70 375,76 L375,120 L0,120 Z"
        fill={hills.mid} opacity="0.85"
      />

      {/* Hill 3 — front */}
      <path
        d="M0,110 C50,93 90,86 130,93 C170,100 200,89 240,96 C280,103 330,87 375,93 L375,120 L0,120 Z"
        fill={hills.front}
      />

      {/* Tree 1 */}
      <g transform="translate(28,76)">
        <polygon points="10,0 20,18 0,18" fill={trees.canopy} />
        <polygon points="10,10 22,30 -2,30" fill={trees.mid} />
        <rect x="8" y="30" width="4" height="8" fill={trees.trunk} />
      </g>

      {/* Tree 2 */}
      <g transform="translate(60,70)">
        <polygon points="8,0 16,14 0,14" fill={trees.canopy} />
        <polygon points="8,8 18,24 -2,24" fill={trees.mid} />
        <rect x="6" y="24" width="4" height="6" fill={trees.trunk} />
      </g>

      {/* Tree 3 */}
      <g transform="translate(198,73)">
        <polygon points="10,0 20,18 0,18" fill={trees.canopy} />
        <polygon points="10,10 22,30 -2,30" fill={trees.mid} />
        <rect x="8" y="30" width="4" height="8" fill={trees.trunk} />
      </g>

      {/* Tree 4 */}
      <g transform="translate(232,67)">
        <polygon points="9,0 18,16 0,16" fill={trees.canopy} />
        <polygon points="9,9 20,26 -2,26" fill={trees.mid} />
        <rect x="7" y="26" width="4" height="7" fill={trees.trunk} />
      </g>

      {/* Tree 5 */}
      <g transform="translate(308,74)">
        <polygon points="10,0 20,18 0,18" fill={trees.canopy} />
        <polygon points="10,10 22,30 -2,30" fill={trees.mid} />
        <rect x="8" y="30" width="4" height="8" fill={trees.trunk} />
      </g>

      {/* Tree 6 */}
      <g transform="translate(340,68)">
        <polygon points="8,0 16,14 0,14" fill={trees.canopy} />
        <polygon points="8,8 18,24 -2,24" fill={trees.mid} />
        <rect x="6" y="24" width="4" height="6" fill={trees.trunk} />
      </g>
    </svg>
  );
}
