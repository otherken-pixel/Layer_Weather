"""Generate app icons from SVG matching the uploaded cloud+sun+rain style."""
import math
import cairosvg
import os

BLUE = "#0B7DD4"
CLOUD_FILL = "#B8EDF6"
CLOUD_SHADOW = "#8DD8EC"

def sun_ray(cx, cy, angle_deg, r_inner, r_outer):
    r = math.radians(angle_deg)
    x1 = cx + r_inner * math.cos(r)
    y1 = cy + r_inner * math.sin(r)
    x2 = cx + r_outer * math.cos(r)
    y2 = cy + r_outer * math.sin(r)
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{BLUE}" stroke-width="20" stroke-linecap="round"/>'


# ── Build SVG ──────────────────────────────────────────────────────────────────
def build_svg(size: int) -> str:
    # Everything designed on a 512×512 canvas; cairosvg scales to output size.
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">']

    # ── Sun (drawn first so cloud overlaps it) ──
    scx, scy = 342, 150
    sun_r = 52
    for angle in range(0, 360, 45):
        parts.append(sun_ray(scx, scy, angle, sun_r + 18, sun_r + 46))
    # Filled circle + lighter inner
    parts.append(f'<circle cx="{scx}" cy="{scy}" r="{sun_r}" fill="{BLUE}"/>')
    parts.append(f'<circle cx="{scx}" cy="{scy}" r="36" fill="#E0F5FF"/>')

    # ── Cloud ──
    # Path designed as a fluffy cloud covering left-centre with bumps at top.
    cloud = (
        "M 62 318 "
        "C 42 318 38 296 40 278 "
        "C 42 260 54 246 72 242 "
        "C 68 214 78 192 100 182 "
        "C 118 174 140 176 155 188 "
        "C 158 170 170 152 192 146 "
        "C 212 140 234 148 246 164 "
        "C 254 146 270 128 294 124 "
        "C 318 120 338 136 344 158 "
        "C 360 152 378 160 390 176 "
        "C 404 196 402 220 388 236 "
        "C 408 242 422 260 422 282 "
        "C 422 306 404 320 384 320 "
        "Z"
    )
    # Subtle inner shadow highlight
    shadow = (
        "M 90 316 "
        "C 76 316 70 302 72 290 "
        "C 74 278 84 268 96 265 "
        "C 93 244 102 228 120 220 "
        "C 134 214 152 216 164 226 "
        "C 167 210 178 194 198 188 "
        "C 215 182 234 189 244 202 "
        "C 252 188 266 172 285 168 "
        "C 303 164 320 174 326 190 "
        "C 340 184 354 191 362 204 "
        "C 370 218 366 236 354 248 "
        "C 370 252 382 266 382 282 "
        "C 382 300 368 314 354 316 "
        "Z"
    )
    parts.append(f'<path d="{cloud}" fill="{CLOUD_FILL}"/>')
    parts.append(f'<path d="{shadow}" fill="{CLOUD_SHADOW}" opacity="0.45"/>')
    # Outline
    parts.append(f'<path d="{cloud}" fill="none" stroke="{BLUE}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>')

    # ── Rain drops (3 diagonal lines angled ~30° leftward) ──
    drops = [
        (150, 356, 120, 418),
        (244, 356, 214, 418),
        (338, 356, 308, 418),
    ]
    for x1, y1, x2, y2 in drops:
        parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{BLUE}" stroke-width="22" stroke-linecap="round"/>')

    parts.append("</svg>")
    return "\n".join(parts)


def render(svg_str: str, out_path: str, size: int):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    cairosvg.svg2png(bytestring=svg_str.encode(), write_to=out_path,
                     output_width=size, output_height=size)
    print(f"  wrote {out_path} ({size}x{size})")


svg = build_svg(512)

# Save SVG source for reference
with open("/home/user/weartoday/public/icons/icon.svg", "w") as f:
    f.write(svg)

# PWA icons (transparent background)
render(svg, "/home/user/weartoday/public/icons/icon.png",           1024)
render(svg, "/home/user/weartoday/public/icons/notification-icon.png", 192)
render(svg, "/home/user/weartoday/public/icons/favicon.png",         64)

# Maskable / adaptive icon: add a white background so safe-zone looks clean
maskable_svg = svg.replace(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
    '<rect width="512" height="512" fill="#EEF8FF"/>'
    # Shrink inner content by wrapping in a scale transform (safe zone = 80%)
)
# Rebuild with white bg + 10% padding (safe zone)
maskable_parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    '<rect width="512" height="512" rx="0" fill="#E4F5FF"/>',
    f'<g transform="translate(26,26) scale(0.9)">',
    svg.split("<svg")[1].split(">", 1)[1].rsplit("</svg>", 1)[0],
    '</g>',
    '</svg>',
]
maskable_svg = "\n".join(maskable_parts)
render(maskable_svg, "/home/user/weartoday/public/icons/adaptive-icon.png", 1024)

# Apple touch icon (180×180, white background)
apple_parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    '<rect width="512" height="512" fill="#FFFFFF"/>',
    svg.split("<svg")[1].split(">", 1)[1].rsplit("</svg>", 1)[0],
    '</svg>',
]
render("\n".join(apple_parts), "/home/user/weartoday/public/icons/apple-touch-icon.png", 180)

# Mirror to /assets/ (Capacitor reads from here)
import shutil
for name in ["icon.png", "favicon.png", "adaptive-icon.png", "notification-icon.png"]:
    src = f"/home/user/weartoday/public/icons/{name}"
    dst = f"/home/user/weartoday/assets/{name}"
    shutil.copy2(src, dst)
    print(f"  copied to assets/{name}")

print("Done.")
