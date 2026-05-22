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
    scx, scy = 358, 140
    sun_r = 80
    for angle in range(0, 360, 45):
        parts.append(sun_ray(scx, scy, angle, sun_r + 22, sun_r + 54))
    # Filled circle + lighter inner
    parts.append(f'<circle cx="{scx}" cy="{scy}" r="{sun_r}" fill="{BLUE}"/>')
    parts.append(f'<circle cx="{scx}" cy="{scy}" r="56" fill="#E0F5FF"/>')

    # ── Cloud (smaller, shifted down/left so sun stands out) ──
    cloud = (
        "M 52 340 "
        "C 32 340 28 318 30 300 "
        "C 32 282 44 268 62 264 "
        "C 58 238 68 218 88 208 "
        "C 104 200 124 202 138 213 "
        "C 141 196 152 178 172 172 "
        "C 190 166 210 174 221 189 "
        "C 228 173 243 156 264 152 "
        "C 285 148 302 162 308 182 "
        "C 322 177 336 183 346 197 "
        "C 358 215 355 237 342 252 "
        "C 360 257 372 273 372 293 "
        "C 372 315 355 328 336 330 "
        "Z"
    )
    # Subtle inner shadow highlight
    shadow = (
        "M 78 337 "
        "C 66 337 60 323 62 312 "
        "C 64 300 73 290 85 287 "
        "C 82 266 90 250 107 243 "
        "C 119 237 135 239 145 249 "
        "C 148 234 158 218 176 212 "
        "C 192 207 209 213 218 226 "
        "C 225 213 238 198 255 194 "
        "C 272 190 287 200 292 215 "
        "C 304 210 316 216 323 228 "
        "C 330 241 326 258 315 268 "
        "C 330 271 340 284 340 299 "
        "C 340 316 327 328 314 329 "
        "Z"
    )
    parts.append(f'<path d="{cloud}" fill="{CLOUD_FILL}"/>')
    parts.append(f'<path d="{shadow}" fill="{CLOUD_SHADOW}" opacity="0.45"/>')
    # Outline
    parts.append(f'<path d="{cloud}" fill="none" stroke="{BLUE}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>')

    # ── Rain drops (repositioned below smaller cloud) ──
    drops = [
        (118, 358, 88, 420),
        (202, 358, 172, 420),
        (286, 358, 256, 420),
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
