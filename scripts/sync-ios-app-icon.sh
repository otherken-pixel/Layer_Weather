#!/usr/bin/env bash
# Copy Layer Weather app icon into the Capacitor iOS asset catalog.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_SRC="$ROOT/public/icons/icon.png"
ICON_SET="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"
ICON_DST="$ICON_SET/AppIcon-512@2x.png"

if [[ ! -f "$ICON_SRC" ]]; then
  echo "ERROR: Missing $ICON_SRC — run: python3 scripts/generate_icons.py"
  exit 1
fi

if [[ ! -d "$ICON_SET" ]]; then
  echo "ERROR: $ICON_SET not found — run: npx cap add ios"
  exit 1
fi

cp "$ICON_SRC" "$ICON_DST"
echo "✓ iOS app icon updated: $ICON_DST"
