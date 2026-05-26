#!/usr/bin/env bash
# npm run ios:prepare — runs fix-ios-build.sh, then wires native targets when present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/fix-ios-build.sh"

if [[ -f "$ROOT/scripts/setup-xcode-targets.rb" ]] && [[ -d "$ROOT/native/ios" ]]; then
  if command -v bundle >/dev/null 2>&1 && [[ -f "$ROOT/Gemfile" ]]; then
    setup_ruby=(bundle exec ruby)
  else
    setup_ruby=(ruby)
  fi
  if ! (cd "$ROOT" && "${setup_ruby[@]}" -e "require 'xcodeproj'") 2>/dev/null; then
    echo "==> Skipping setup-xcode-targets.rb (install xcodeproj: gem install xcodeproj, or bundle install from project root)"
  else
    echo "==> Wiring native widget/watch targets into Xcode…"
    (cd "$ROOT" && "${setup_ruby[@]}" "$ROOT/scripts/setup-xcode-targets.rb")
  fi
fi
