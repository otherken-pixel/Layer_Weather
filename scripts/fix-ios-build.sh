#!/usr/bin/env bash
# Fix "Unable to resolve module dependency: Capacitor" and missing Pods framework paths.
# Run from the project root on macOS after: brew install cocoapods
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_APP="$ROOT/ios/App"
PODFILE="$IOS_APP/Podfile"
WORKSPACE="$IOS_APP/App.xcworkspace"
PODS_DIR="$IOS_APP/Pods"
GEMFILE="$ROOT/Gemfile"

cd "$ROOT"

echo "=== Layer Weather — iOS build repair ==="
echo ""

# Gemfile makes Capacitor run 'bundle exec pod', which often fails on macOS system Ruby.
if [[ -f "$GEMFILE" ]]; then
  echo "⚠️  Renaming Gemfile → Gemfile.disabled (use Homebrew CocoaPods instead of Bundler)."
  mv "$GEMFILE" "$ROOT/Gemfile.disabled"
  echo ""
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "ERROR: CocoaPods is not installed."
  echo "  brew install cocoapods"
  exit 1
fi
echo "✓ CocoaPods: $(pod --version) at $(command -v pod)"

if [[ ! -f "$PODFILE" ]]; then
  echo "==> No ios/App/Podfile — adding iOS platform…"
  npm install
  npm run build
  npx cap add ios
fi

if [[ ! -f "$ROOT/.env" ]]; then
  echo "ERROR: Missing .env in project root."
  echo "  cp .env.example .env"
  echo "  Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase → Project Settings → API"
  exit 1
fi

echo "==> Building web app for iOS (no service worker)…"
npm run build:ios

echo "==> Capacitor sync (using system pod, not Bundler)…"
export CAPACITOR_COCOAPODS_PATH="pod"
npx cap sync ios

echo "==> pod install in ios/App…"
cd "$IOS_APP"
pod install --repo-update
cd "$ROOT"

if [[ ! -d "$PODS_DIR" ]]; then
  echo ""
  echo "ERROR: $PODS_DIR was not created. pod install failed."
  exit 1
fi

if [[ ! -f "$IOS_APP/Pods/Target Support Files/Pods-App/Pods-App.debug.xcconfig" ]]; then
  echo "ERROR: Pods-App xcconfig missing. pod install did not complete correctly."
  exit 1
fi

if [[ ! -f "$WORKSPACE/contents.xcworkspacedata" ]]; then
  echo "ERROR: Workspace missing at $WORKSPACE"
  exit 1
fi

if ! grep -q "Pods.xcodeproj" "$WORKSPACE/contents.xcworkspacedata" 2>/dev/null; then
  echo "WARNING: Workspace may not reference Pods.xcodeproj — ensure you open App.xcworkspace"
fi

bash "$ROOT/scripts/sync-ios-app-icon.sh" || true
bash "$ROOT/scripts/sync-ios-watch-icon.sh" 2>/dev/null || true

echo "==> Wiring widget, watch, and complication targets…"
if [[ -f "$ROOT/scripts/setup-xcode-targets.rb" ]] && [[ -d "$ROOT/native/ios" ]]; then
  if ruby -e "require 'xcodeproj'" 2>/dev/null; then
    ruby "$ROOT/scripts/setup-xcode-targets.rb"
  else
    echo "WARNING: gem install xcodeproj — then run: ruby scripts/setup-xcode-targets.rb"
  fi
fi

echo ""
echo "✅ Pods installed successfully."
echo ""
echo "NEXT — in Xcode:"
echo "  1. Quit Xcode completely (Cmd+Q)"
echo "  2. Open ONLY this file (not App.xcodeproj):"
echo "       open $WORKSPACE"
echo "  3. Product → Clean Build Folder (Shift+Cmd+K)"
echo "  4. Build (Cmd+B)"
echo ""
echo "If it still fails: Xcode → Settings → Locations → Derived Data → delete the App-* folder, then rebuild."
echo ""
echo "Open workspace:"
echo "  open $WORKSPACE"
