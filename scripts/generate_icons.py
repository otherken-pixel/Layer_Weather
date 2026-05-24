"""Generate app icons from public/icons/icon.svg using sharp-cli."""
import os
import subprocess
import shutil

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(REPO, "public", "icons", "icon.svg")


def render(out_path: str, size: int):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    subprocess.run(
        ["npx", "sharp-cli", "-i", SVG, "-o", out_path, "resize", str(size), str(size)],
        check=True, cwd=REPO,
    )
    print(f"  wrote {out_path} ({size}x{size})")


render(os.path.join(REPO, "public/icons/icon.png"),           1024)
render(os.path.join(REPO, "public/icons/notification-icon.png"), 192)
render(os.path.join(REPO, "public/icons/favicon.png"),         64)
render(os.path.join(REPO, "public/icons/adaptive-icon.png"),  1024)
render(os.path.join(REPO, "public/icons/apple-touch-icon.png"), 180)

for name in ["icon.png", "favicon.png", "adaptive-icon.png", "notification-icon.png"]:
    src = os.path.join(REPO, "public/icons", name)
    dst = os.path.join(REPO, "assets", name)
    shutil.copy2(src, dst)
    print(f"  copied to assets/{name}")

print("Done.")
