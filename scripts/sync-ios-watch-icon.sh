#!/usr/bin/env bash
# Copy app icon into the Watch app asset catalog (creates catalog if needed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/icons/icon.png"
ICON_SET="$ROOT/ios/App/App/LayerWeatherWatch/Assets.xcassets/AppIcon.appiconset"
ICON_FILE="$ICON_SET/AppIcon-1024.png"

[[ -f "$SRC" ]] || { echo "ERROR: Missing $SRC"; exit 1; }

mkdir -p "$ICON_SET"
if [[ ! -f "$ICON_SET/Contents.json" ]]; then
  cat > "$ICON_SET/Contents.json" <<'JSON'
{
  "images": [
    {
      "filename": "AppIcon-1024.png",
      "idiom": "universal",
      "platform": "watchos",
      "size": "1024x1024"
    }
  ],
  "info": { "author": "xcode", "version": 1 }
}
JSON
fi

bash "$ROOT/scripts/strip-png-alpha.sh" "$SRC" "$ICON_FILE"
echo "✓ Watch app icon updated (opaque RGB): $ICON_FILE"
