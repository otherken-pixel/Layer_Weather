import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  Rect,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";

import type { OutfitType, AvatarCondition } from "@/types";
import { OutfitColors, DEFAULT_SKIN } from "@/constants/colors";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

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
  // ── Idle float ───────────────────────────────────────────────────────────
  const floatY = useSharedValue(0);
  const windSway = useSharedValue(0);
  const umbrellaRock = useSharedValue(0);
  const rainOpacity = useSharedValue(0);
  const snowOpacity = useSharedValue(0);
  const sunRayRotation = useSharedValue(0);
  const sunRayScale = useSharedValue(1);

  useEffect(() => {
    // Gentle bob — always on
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Wind sway
    if (condition === "windy" || condition === "stormy") {
      windSway.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(6, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      );
    } else {
      windSway.value = withTiming(0, { duration: 400 });
    }

    // Umbrella rocking
    if (umbrella) {
      umbrellaRock.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1200 }),
          withTiming(4, { duration: 1200 })
        ),
        -1,
        true
      );
    }

    // Rain visibility
    if (condition === "rainy" || condition === "stormy") {
      rainOpacity.value = withTiming(1, { duration: 600 });
    } else {
      rainOpacity.value = withTiming(0, { duration: 400 });
    }

    // Snow visibility
    if (condition === "snowy") {
      snowOpacity.value = withTiming(1, { duration: 600 });
    } else {
      snowOpacity.value = withTiming(0, { duration: 400 });
    }

    // Sun rays
    if (condition === "sunny") {
      sunRayRotation.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );
      sunRayScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000 }),
          withTiming(0.95, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [condition, umbrella]);

  const bodyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const scale = size / 320;
  const colors = OutfitColors[outfit];
  const skin = DEFAULT_SKIN;

  const isJacket =
    outfit === "light_jacket" ||
    outfit === "heavy_jacket" ||
    outfit === "heavy_coat" ||
    outfit === "rain_light" ||
    outfit === "rain_heavy";

  const shortsMode = outfit === "shorts_tshirt";
  const pantsColor =
    "bottom" in colors ? colors.bottom : "#2D3748";
  const pantsShadow =
    "bottomShadow" in colors ? colors.bottomShadow : "#1A202C";

  const jacketColor =
    "jacket" in colors ? (colors as { jacket: string }).jacket : undefined;
  const jacketShadow =
    "jacketShadow" in colors
      ? (colors as { jacketShadow: string }).jacketShadow
      : undefined;

  const topColor = colors.top;

  // Raindrops positions
  const raindrops = [
    { x: 30, y: 20, delay: 0 },
    { x: 80, y: 0, delay: 200 },
    { x: 140, y: 30, delay: 100 },
    { x: 200, y: 10, delay: 300 },
    { x: 260, y: 25, delay: 50 },
    { x: 50, y: 60, delay: 150 },
    { x: 110, y: 70, delay: 250 },
    { x: 170, y: 55, delay: 350 },
    { x: 230, y: 65, delay: 80 },
    { x: 290, y: 40, delay: 180 },
  ];

  return (
    <Animated.View
      style={[{ width: size, height: size * 1.2 }, bodyAnimStyle]}
    >
      <Svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 320 384"
      >
        <Defs>
          <LinearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skin.skin} />
            <Stop offset="1" stopColor={skin.shadow} />
          </LinearGradient>
          <LinearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={topColor} />
            <Stop offset="1" stopColor={"topShadow" in colors ? colors.topShadow : "#E0E0E0"} />
          </LinearGradient>
          {jacketColor && (
            <LinearGradient id="jacketGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={jacketColor} />
              <Stop offset="1" stopColor={jacketShadow ?? jacketColor} />
            </LinearGradient>
          )}
          <LinearGradient id="pantGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pantsColor} />
            <Stop offset="1" stopColor={pantsShadow} />
          </LinearGradient>
        </Defs>

        {/* ── Sun rays (condition=sunny) ─────────────────────────────────── */}
        {condition === "sunny" && (
          <G opacity={0.35}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 160 + 65 * Math.cos(rad);
              const y1 = 120 + 65 * Math.sin(rad);
              const x2 = 160 + 90 * Math.cos(rad);
              const y2 = 120 + 90 * Math.sin(rad);
              return (
                <Path
                  key={i}
                  d={`M${x1},${y1} L${x2},${y2}`}
                  stroke="#FFD700"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        )}

        {/* ── Raindrops ─────────────────────────────────────────────────── */}
        {(condition === "rainy" || condition === "stormy") &&
          raindrops.map((drop, i) => (
            <RaindropParticle key={i} x={drop.x} startY={drop.y} delayMs={drop.delay} />
          ))}

        {/* ── Snowflakes ────────────────────────────────────────────────── */}
        {condition === "snowy" &&
          [{ x: 50, y: 50 }, { x: 130, y: 30 }, { x: 220, y: 45 }, { x: 280, y: 20 }, { x: 90, y: 15 }].map((pos, i) => (
            <SnowflakeParticle key={i} x={pos.x} startY={pos.y} delayMs={i * 300} />
          ))}

        {/* ── Hair ─────────────────────────────────────────────────────── */}
        {beanie ? (
          <G>
            {/* Beanie base */}
            <Path
              d="M105,80 Q105,40 160,38 Q215,40 215,80 Z"
              fill={outfit === "heavy_coat" ? "#5D4037" : "#37474F"}
            />
            {/* Beanie brim */}
            <Rect x="102" y="78" width="116" height="14" rx="7" fill={outfit === "heavy_coat" ? "#795548" : "#546E7A"} />
            {/* Pom pom */}
            <Circle cx="160" cy="42" r="12" fill={outfit === "heavy_coat" ? "#A1887F" : "#78909C"} />
          </G>
        ) : (
          <WindHair windSway={windSway} skinColor={skin.hair} isWindy={condition === "windy" || condition === "stormy"} />
        )}

        {/* ── Head ─────────────────────────────────────────────────────── */}
        <Circle cx="160" cy="120" r="58" fill="url(#skinGrad)" />

        {/* ── Face features ─────────────────────────────────────────────── */}
        {sunglasses ? (
          <G>
            <Rect x="125" y="110" width="28" height="18" rx="9" fill="#1A1A2E" opacity={0.9} />
            <Rect x="168" y="110" width="28" height="18" rx="9" fill="#1A1A2E" opacity={0.9} />
            <Path d="M153,119 L168,119" stroke="#1A1A2E" strokeWidth="2.5" />
            <Path d="M115,115 L125,113" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M205,115 L196,113" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Circle cx="142" cy="115" r="6" fill="#2D1B0E" />
            <Circle cx="178" cy="115" r="6" fill="#2D1B0E" />
            <Circle cx="144" cy="113" r="2" fill="white" opacity={0.7} />
            <Circle cx="180" cy="113" r="2" fill="white" opacity={0.7} />
          </G>
        )}

        {/* Smile */}
        <Path
          d={condition === "stormy" || condition === "rainy" ? "M148,138 Q160,132 172,138" : "M148,135 Q160,146 172,135"}
          fill="none"
          stroke="#C07A50"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Nose */}
        <Path
          d="M157,124 Q160,130 163,124"
          fill="none"
          stroke={skin.shadow}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Cheeks */}
        <Ellipse cx="130" cy="132" rx="12" ry="7" fill="#F48FB1" opacity={0.35} />
        <Ellipse cx="190" cy="132" rx="12" ry="7" fill="#F48FB1" opacity={0.35} />

        {/* ── Neck ─────────────────────────────────────────────────────── */}
        <Rect x="146" y="174" width="28" height="22" rx="8" fill="url(#skinGrad)" />

        {/* ── Scarf ─────────────────────────────────────────────────────── */}
        {scarf && (
          <G>
            <Path
              d="M118,175 Q160,165 202,175 Q202,195 160,192 Q118,195 118,175 Z"
              fill="#B71C1C"
            />
            {/* Scarf tail */}
            <Rect x="125" y="190" width="18" height="40" rx="9" fill="#C62828" />
          </G>
        )}

        {/* ── Body (shirt/jacket/coat) ──────────────────────────────────── */}

        {/* Base shirt */}
        <Path
          d="M95,198 L72,215 L72,300 L248,300 L248,215 L225,198 Q200,185 160,183 Q120,185 95,198 Z"
          fill="url(#topGrad)"
        />

        {/* Jacket / coat overlay */}
        {isJacket && jacketColor && (
          <G>
            {/* Jacket left panel */}
            <Path
              d="M95,198 L72,215 L72,300 L155,300 L155,196 Q125,186 95,198 Z"
              fill="url(#jacketGrad)"
            />
            {/* Jacket right panel */}
            <Path
              d="M225,198 L248,215 L248,300 L165,300 L165,196 Q195,186 225,198 Z"
              fill="url(#jacketGrad)"
            />
            {/* Collar */}
            <Path
              d="M135,192 Q160,200 185,192 L175,218 Q160,226 145,218 Z"
              fill={jacketColor}
              opacity={0.7}
            />
            {/* Zipper */}
            <Path
              d="M160,210 L160,300"
              stroke="#90A4AE"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          </G>
        )}

        {/* Left arm */}
        <Path
          d="M75,215 Q45,225 38,260 Q36,275 50,278 L72,270 L72,215"
          fill={isJacket && jacketColor ? "url(#jacketGrad)" : "url(#topGrad)"}
        />
        {/* Left hand */}
        <Circle cx="44" cy="280" r="14" fill="url(#skinGrad)" />

        {/* Right arm */}
        {!umbrella ? (
          <G>
            <Path
              d="M245,215 Q275,225 282,260 Q284,275 270,278 L248,270 L248,215"
              fill={isJacket && jacketColor ? "url(#jacketGrad)" : "url(#topGrad)"}
            />
            <Circle cx="276" cy="280" r="14" fill="url(#skinGrad)" />
          </G>
        ) : (
          <G>
            {/* Right arm raised holding umbrella */}
            <Path
              d="M245,215 Q265,195 270,170 L260,168 L248,215"
              fill={isJacket && jacketColor ? "url(#jacketGrad)" : "url(#topGrad)"}
            />
            {/* Umbrella handle */}
            <Path
              d="M263,170 L263,80"
              stroke="#4A5568"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Umbrella canopy */}
            <Path
              d="M213,80 Q263,48 313,80 Q313,85 263,92 Q213,85 213,80 Z"
              fill="#2B6CB0"
              opacity={0.9}
            />
            <Path
              d="M213,80 Q263,88 313,80"
              fill="none"
              stroke="#2C5282"
              strokeWidth="1.5"
            />
            {/* Umbrella panels */}
            {[0, 1, 2, 3, 4].map((i) => {
              const x = 213 + i * 20;
              return (
                <Path
                  key={i}
                  d={`M${x + 10},80 Q${x + 10},90 ${x + 10},92`}
                  stroke="#2C5282"
                  strokeWidth="1"
                  opacity={0.5}
                />
              );
            })}
            {/* Umbrella hook */}
            <Path
              d="M263,170 Q255,185 255,192 Q255,200 263,200"
              fill="none"
              stroke="#4A5568"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Circle cx="263" cy="167" r="8" fill="url(#skinGrad)" />
          </G>
        )}

        {/* ── Legs ─────────────────────────────────────────────────────── */}
        {/* Left leg */}
        <Rect
          x="108"
          y="298"
          width="46"
          height={shortsMode ? 45 : 75}
          rx="18"
          fill="url(#pantGrad)"
        />
        {/* Right leg */}
        <Rect
          x="166"
          y="298"
          width="46"
          height={shortsMode ? 45 : 75}
          rx="18"
          fill="url(#pantGrad)"
        />

        {/* ── Shoes ─────────────────────────────────────────────────────── */}
        <Ellipse
          cx="131"
          cy={shortsMode ? 352 : 382}
          rx="28"
          ry="12"
          fill="#2D3748"
        />
        <Ellipse
          cx="189"
          cy={shortsMode ? 352 : 382}
          rx="28"
          ry="12"
          fill="#2D3748"
        />

        {/* Shoe highlights */}
        <Ellipse
          cx="125"
          cy={shortsMode ? 348 : 378}
          rx="10"
          ry="4"
          fill="white"
          opacity={0.2}
        />
        <Ellipse
          cx="183"
          cy={shortsMode ? 348 : 378}
          rx="10"
          ry="4"
          fill="white"
          opacity={0.2}
        />

        {/* ── Shadow under character ───────────────────────────────────── */}
        <Ellipse
          cx="160"
          cy={shortsMode ? 362 : 392}
          rx="60"
          ry="10"
          fill="rgba(0,0,0,0.15)"
        />
      </Svg>
    </Animated.View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WindHair({
  windSway,
  skinColor,
  isWindy,
}: {
  windSway: Animated.SharedValue<number>;
  skinColor: string;
  isWindy: boolean;
}) {
  const animProps = useAnimatedProps(() => {
    const sway = windSway.value;
    return {
      d: isWindy
        ? `M102,100 Q${110 + sway * 2},50 160,48 Q${220 + sway},50 218,100 Q190,70 160,68 Q${130 + sway},70 102,100 Z`
        : "M102,100 Q110,52 160,48 Q210,52 218,100 Q190,72 160,70 Q130,72 102,100 Z",
    };
  });

  return (
    <G>
      {/* Main hair shape */}
      <AnimatedPath
        animatedProps={animProps}
        fill={skinColor}
      />
      {/* Side hair bits */}
      <Path
        d="M103,100 Q90,115 98,135 Q105,120 108,110"
        fill={skinColor}
      />
      <Path
        d="M217,100 Q230,115 222,135 Q215,120 212,110"
        fill={skinColor}
      />
    </G>
  );
}

function RaindropParticle({ x, startY, delayMs }: { x: number; startY: number; delayMs: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.linear }),
        -1,
        false
      );
    }, delayMs);
    return () => clearTimeout(timeout);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * 260 }],
    opacity: interpolate(progress.value, [0, 0.1, 0.85, 1], [0, 0.7, 0.7, 0]),
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: startY, width: 2, height: 10, borderRadius: 1, backgroundColor: "#90CAF9" }, animStyle]}
    />
  );
}

function SnowflakeParticle({ x, startY, delayMs }: { x: number; startY: number; delayMs: number }) {
  const progress = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
      sway.value = withRepeat(
        withSequence(withTiming(15, { duration: 1500 }), withTiming(-15, { duration: 1500 })),
        -1,
        true
      );
    }, delayMs);
    return () => clearTimeout(timeout);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * 300 },
      { translateX: sway.value },
    ],
    opacity: interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 0.8, 0.8, 0]),
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: startY }, animStyle]}
    >
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Path d="M7,1 L7,13 M1,7 L13,7 M3,3 L11,11 M11,3 L3,11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}
