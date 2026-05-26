#!/usr/bin/env bash
# Prepare the Capacitor iOS project for Xcode builds.
#
# Fixes "Unable to resolve module dependency: Capacitor" by installing CocoaPods
# frameworks and ensuring web assets are synced. Always open App.xcworkspace
# (not App.xcodeproj) after this script completes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_APP_DIR="$ROOT/ios/App"
PODFILE="$IOS_APP_DIR/Podfile"
WORKSPACE="$IOS_APP_DIR/App.xcworkspace"

cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "==> Installing npm dependencies…"
  npm install
fi

echo "==> Building web assets (dist/)…"
npm run build

if [[ ! -f "$PODFILE" ]]; then
  echo "==> Adding iOS platform…"
  npx cap add ios
fi

echo "==> Syncing Capacitor iOS plugins and web assets…"
npx cap sync ios

if [[ ! -f "$PODFILE" ]]; then
  echo "ERROR: Podfile not found at ios/App/Podfile"
  echo "Run: npx cap add ios"
  exit 1
fi

echo "==> Installing CocoaPods (ios/App)…"
cd "$IOS_APP_DIR"

if command -v bundle >/dev/null 2>&1 && [[ -f "$ROOT/Gemfile" ]]; then
  (cd "$ROOT" && bundle check >/dev/null 2>&1 || bundle install --quiet)
  (cd "$ROOT" && bundle exec pod install --project-directory="$IOS_APP_DIR")
else
  if ! command -v pod >/dev/null 2>&1; then
    echo "ERROR: CocoaPods is not installed."
    echo "Install with: sudo gem install cocoapods"
    echo "Or use Bundler from the project root: bundle install && bundle exec pod install --project-directory=ios/App"
    exit 1
  fi
  pod install
fi

cd "$ROOT"

if [[ ! -d "$IOS_APP_DIR/Pods" ]]; then
  echo "ERROR: Pods/ directory was not created under ios/App."
  echo "Check the pod install output above for errors."
  exit 1
fi

if [[ -f "$ROOT/scripts/setup-xcode-targets.rb" ]] && [[ -d "$ROOT/native/ios" ]]; then
  if ! ruby -e "require 'xcodeproj'" 2>/dev/null; then
    echo "==> Skipping setup-xcode-targets.rb (install xcodeproj: gem install xcodeproj)"
  else
    echo "==> Wiring native widget/watch targets into Xcode…"
    ruby "$ROOT/scripts/setup-xcode-targets.rb"
  fi
fi

echo ""
echo "✅ iOS project is ready for Xcode."
echo ""
echo "Open the workspace (required — do NOT open App.xcodeproj):"
echo "  open $WORKSPACE"
echo ""
echo "Or: npm run ios:open"
