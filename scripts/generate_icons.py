"""Generate app icons from public/icons/icon.svg using sharp-cli."""
import math
import os
import shutil
import subprocess
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(REPO, "public", "icons", "icon.svg")
# Opaque fill matching the icon's main background (maskable safe zone backdrop).
MASKABLE_BG = "#00C96A"


def _svg_density_for_size(size: int) -> int:
    """DPI so a 512-unit-wide viewBox rasterizes to at least ``size`` px before resize."""
    return max(1, math.ceil(size * 72 / 512))


def _maskable_svg_source() -> str:
    with open(SVG, encoding="utf-8") as f:
        s = f.read()
    start = s.find("<svg")
    if start == -1:
        raise ValueError(f"No <svg> tag in {SVG}")
    open_end = s.find(">", start) + 1
    inner = s[open_end : s.rfind("</svg>")]
    head = s[:open_end]
    return (
        head
        + f'<rect width="512" height="512" fill="{MASKABLE_BG}"/>'
        + '<g transform="translate(256 256) scale(0.9) translate(-256 -256)">'
        + inner
        + "</g></svg>"
    )


def render(out_path: str, size: int, *, input_svg: str | None = None):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    density = _svg_density_for_size(size)
    src = input_svg or SVG
    subprocess.run(
        [
            "npx",
            "sharp-cli",
            "--density",
            str(density),
            "-i",
            src,
            "-o",
            out_path,
            "resize",
            str(size),
            str(size),
        ],
        check=True,
        cwd=REPO,
    )
    print(f"  wrote {out_path} ({size}x{size})")


render(os.path.join(REPO, "public/icons/icon.png"), 1024)
render(os.path.join(REPO, "public/icons/notification-icon.png"), 192)
render(os.path.join(REPO, "public/icons/favicon.png"), 64)
with tempfile.NamedTemporaryFile(
    mode="w",
    suffix=".svg",
    delete=False,
    encoding="utf-8",
) as tmp:
    tmp.write(_maskable_svg_source())
    maskable_svg = tmp.name
try:
    render(os.path.join(REPO, "public/icons/adaptive-icon.png"), 1024, input_svg=maskable_svg)
finally:
    os.unlink(maskable_svg)

render(os.path.join(REPO, "public/icons/apple-touch-icon.png"), 180)

for name in ["icon.png", "favicon.png", "adaptive-icon.png", "notification-icon.png"]:
    src = os.path.join(REPO, "public/icons", name)
    dst = os.path.join(REPO, "assets", name)
    shutil.copy2(src, dst)
    print(f"  copied to assets/{name}")

print("Done.")
