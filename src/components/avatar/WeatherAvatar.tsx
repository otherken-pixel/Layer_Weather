import React from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect } from "react";
import type { OutfitType, AvatarCondition } from "@/types";
import { OutfitColors, DEFAULT_SKIN } from "@/constants/colors";

interface WeatherAvatarProps {
  outfit: OutfitType;
  condition: AvatarCondition;
  umbrella?: boolean;
  sunglasses?: boolean;
  scarf?: boolean;
  beanie?: boolean;
  size?: number;
}

export function WeatherAvatar({
  outfit,
  condition,
  umbrella = false,
  sunglasses = false,
  scarf = false,
  beanie = false,
  size = 300,
}: WeatherAvatarProps) {
  const floatY = useMotionValue(0);
  const isWindy = condition === "windy" || condition === "stormy";

  useEffect(() => {
    const ctrl = animate(floatY, [0, -8, 0], {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    });
    return () => ctrl.stop();
  }, [floatY]);

  const colors = OutfitColors[outfit];
  const skin = DEFAULT_SKIN;
  const isJacket =
    outfit === "light_jacket" || outfit === "heavy_jacket" ||
    outfit === "heavy_coat" || outfit === "rain_light" || outfit === "rain_light_shorts" || outfit === "rain_heavy";
  const shortsMode = outfit === "shorts_tshirt" || outfit === "dress" || outfit === "rain_light_shorts";

  const pantsColor = "bottom" in colors ? (colors as { bottom: string }).bottom : "#2D3748";
  const pantsShadow = "bottomShadow" in colors ? (colors as { bottomShadow: string }).bottomShadow : "#1A202C";
  const jacketColor = "jacket" in colors ? (colors as { jacket: string }).jacket : undefined;
  const jacketShadow = "jacketShadow" in colors ? (colors as { jacketShadow: string }).jacketShadow : undefined;
  const topColor = colors.top;
  const topShadow = "topShadow" in colors ? (colors as { topShadow: string }).topShadow : "#E0E0E0";

  const raindrops = [
    { x: 30, y: 20, delay: 0 }, { x: 80, y: 0, delay: 200 }, { x: 140, y: 30, delay: 100 },
    { x: 200, y: 10, delay: 300 }, { x: 260, y: 25, delay: 50 }, { x: 50, y: 60, delay: 150 },
    { x: 110, y: 70, delay: 250 }, { x: 170, y: 55, delay: 350 }, { x: 230, y: 65, delay: 80 },
    { x: 290, y: 40, delay: 180 },
  ];

  const snowflakes = [
    { x: 50, y: 50, delay: 0 }, { x: 130, y: 30, delay: 600 },
    { x: 220, y: 45, delay: 1200 }, { x: 280, y: 20, delay: 300 }, { x: 90, y: 15, delay: 900 },
  ];

  return (
    <div style={{ width: size, height: size * 1.2, position: "relative" }}>
      {/* Rain particles */}
      {(condition === "rainy" || condition === "stormy") && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {raindrops.map((d, i) => (
            <div
              key={i}
              className="raindrop"
              style={{ left: (d.x / 320) * size, top: (d.y / 384) * (size * 1.2), animationDelay: `${d.delay}ms` }}
            />
          ))}
        </div>
      )}

      {/* Snow particles */}
      {condition === "snowy" && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {snowflakes.map((d, i) => (
            <div
              key={i}
              className="snowflake"
              style={{ left: (d.x / 320) * size, top: (d.y / 384) * (size * 1.2), animationDelay: `${d.delay}ms` }}
            >
              <svg width={14} height={14} viewBox="0 0 14 14">
                <path d="M7,1 L7,13 M1,7 L13,7 M3,3 L11,11 M11,3 L3,11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Character — float + wind sway */}
      <motion.div
        style={{ position: "absolute", inset: 0, y: floatY }}
      >
        <motion.div
          animate={isWindy ? { rotate: [-3, 3, -3, 0] } : { rotate: 0 }}
          transition={isWindy ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : {}}
          style={{ transformOrigin: "160px 250px" }}
        >
          <svg width={size} height={size * 1.2} viewBox="0 0 320 384">
            <defs>
              <linearGradient id={`skinGrad-${outfit}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={skin.skin} />
                <stop offset="1" stopColor={skin.shadow} />
              </linearGradient>
              <linearGradient id={`topGrad-${outfit}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={topColor} />
                <stop offset="1" stopColor={topShadow} />
              </linearGradient>
              {jacketColor && (
                <linearGradient id={`jacketGrad-${outfit}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={jacketColor} />
                  <stop offset="1" stopColor={jacketShadow ?? jacketColor} />
                </linearGradient>
              )}
              <linearGradient id={`pantGrad-${outfit}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={pantsColor} />
                <stop offset="1" stopColor={pantsShadow} />
              </linearGradient>
            </defs>

            {/* Sun rays */}
            {condition === "sunny" && (
              <g opacity={0.35}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <path
                      key={i}
                      d={`M${160 + 65 * Math.cos(rad)},${120 + 65 * Math.sin(rad)} L${160 + 90 * Math.cos(rad)},${120 + 90 * Math.sin(rad)}`}
                      stroke="#FFD700" strokeWidth="5" strokeLinecap="round"
                    />
                  );
                })}
              </g>
            )}

            {/* Hair / beanie */}
            {beanie ? (
              <g>
                <path d="M105,80 Q105,40 160,38 Q215,40 215,80 Z" fill={outfit === "heavy_coat" ? "#5D4037" : "#37474F"} />
                <rect x="102" y="78" width="116" height="14" rx="7" fill={outfit === "heavy_coat" ? "#795548" : "#546E7A"} />
                <circle cx="160" cy="42" r="12" fill={outfit === "heavy_coat" ? "#A1887F" : "#78909C"} />
              </g>
            ) : (
              <g>
                <path d="M102,100 Q110,52 160,48 Q210,52 218,100 Q190,72 160,70 Q130,72 102,100 Z" fill={skin.hair} />
                <path d="M103,100 Q90,115 98,135 Q105,120 108,110" fill={skin.hair} />
                <path d="M217,100 Q230,115 222,135 Q215,120 212,110" fill={skin.hair} />
              </g>
            )}

            {/* Head */}
            <circle cx="160" cy="120" r="58" fill={`url(#skinGrad-${outfit})`} />

            {/* Eyes / sunglasses */}
            {sunglasses ? (
              <g>
                <rect x="125" y="110" width="28" height="18" rx="9" fill="#1A1A2E" opacity={0.9} />
                <rect x="168" y="110" width="28" height="18" rx="9" fill="#1A1A2E" opacity={0.9} />
                <path d="M153,119 L168,119" stroke="#1A1A2E" strokeWidth="2.5" />
                <path d="M115,115 L125,113" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M205,115 L196,113" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <circle cx="142" cy="115" r="6" fill="#2D1B0E" />
                <circle cx="178" cy="115" r="6" fill="#2D1B0E" />
                <circle cx="144" cy="113" r="2" fill="white" opacity={0.7} />
                <circle cx="180" cy="113" r="2" fill="white" opacity={0.7} />
              </g>
            )}

            {/* Mouth */}
            <path
              d={condition === "stormy" || condition === "rainy"
                ? "M148,138 Q160,132 172,138"
                : "M148,135 Q160,146 172,135"}
              fill="none" stroke="#C07A50" strokeWidth="3" strokeLinecap="round"
            />

            {/* Nose */}
            <path d="M157,124 Q160,130 163,124" fill="none" stroke={skin.shadow} strokeWidth="2" strokeLinecap="round" />

            {/* Cheeks */}
            <ellipse cx="130" cy="132" rx="12" ry="7" fill="#F48FB1" opacity={0.35} />
            <ellipse cx="190" cy="132" rx="12" ry="7" fill="#F48FB1" opacity={0.35} />

            {/* Neck */}
            <rect x="146" y="174" width="28" height="22" rx="8" fill={`url(#skinGrad-${outfit})`} />

            {/* Scarf */}
            {scarf && (
              <g>
                <path d="M118,175 Q160,165 202,175 Q202,195 160,192 Q118,195 118,175 Z" fill="#B71C1C" />
                <rect x="125" y="190" width="18" height="40" rx="9" fill="#C62828" />
              </g>
            )}

            {/* Shirt body */}
            <path
              d="M95,198 L72,215 L72,300 L248,300 L248,215 L225,198 Q200,185 160,183 Q120,185 95,198 Z"
              fill={`url(#topGrad-${outfit})`}
            />

            {/* Jacket overlay */}
            {isJacket && jacketColor && (
              <g>
                <path d="M95,198 L72,215 L72,300 L155,300 L155,196 Q125,186 95,198 Z" fill={`url(#jacketGrad-${outfit})`} />
                <path d="M225,198 L248,215 L248,300 L165,300 L165,196 Q195,186 225,198 Z" fill={`url(#jacketGrad-${outfit})`} />
                <path d="M135,192 Q160,200 185,192 L175,218 Q160,226 145,218 Z" fill={jacketColor} opacity={0.7} />
                <path d="M160,210 L160,300" stroke="#90A4AE" strokeWidth="2" strokeDasharray="4,4" />
              </g>
            )}

            {/* Left arm */}
            <path
              d="M75,215 Q45,225 38,260 Q36,275 50,278 L72,270 L72,215"
              fill={isJacket && jacketColor ? `url(#jacketGrad-${outfit})` : `url(#topGrad-${outfit})`}
            />
            <circle cx="44" cy="280" r="14" fill={`url(#skinGrad-${outfit})`} />

            {/* Right arm / umbrella */}
            {!umbrella ? (
              <g>
                <path
                  d="M245,215 Q275,225 282,260 Q284,275 270,278 L248,270 L248,215"
                  fill={isJacket && jacketColor ? `url(#jacketGrad-${outfit})` : `url(#topGrad-${outfit})`}
                />
                <circle cx="276" cy="280" r="14" fill={`url(#skinGrad-${outfit})`} />
              </g>
            ) : (
              <g>
                <path
                  d="M245,215 Q265,195 270,170 L260,168 L248,215"
                  fill={isJacket && jacketColor ? `url(#jacketGrad-${outfit})` : `url(#topGrad-${outfit})`}
                />
                <path d="M263,170 L263,80" stroke="#4A5568" strokeWidth="4" strokeLinecap="round" />
                <path d="M213,80 Q263,48 313,80 Q313,85 263,92 Q213,85 213,80 Z" fill="#2B6CB0" opacity={0.9} />
                <path d="M213,80 Q263,88 313,80" fill="none" stroke="#2C5282" strokeWidth="1.5" />
                <path d="M263,170 Q255,185 255,192 Q255,200 263,200" fill="none" stroke="#4A5568" strokeWidth="4" strokeLinecap="round" />
                <circle cx="263" cy="167" r="8" fill={`url(#skinGrad-${outfit})`} />
              </g>
            )}

            {/* Legs */}
            <rect x="108" y="298" width="46" height={shortsMode ? 45 : 75} rx="18" fill={`url(#pantGrad-${outfit})`} />
            <rect x="166" y="298" width="46" height={shortsMode ? 45 : 75} rx="18" fill={`url(#pantGrad-${outfit})`} />

            {/* Shoes */}
            <ellipse cx="131" cy={shortsMode ? 352 : 382} rx="28" ry="12" fill="#2D3748" />
            <ellipse cx="189" cy={shortsMode ? 352 : 382} rx="28" ry="12" fill="#2D3748" />
            <ellipse cx="125" cy={shortsMode ? 348 : 378} rx="10" ry="4" fill="white" opacity={0.2} />
            <ellipse cx="183" cy={shortsMode ? 348 : 378} rx="10" ry="4" fill="white" opacity={0.2} />

            {/* Shadow */}
            <ellipse cx="160" cy={shortsMode ? 362 : 392} rx="60" ry="10" fill="rgba(0,0,0,0.15)" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
