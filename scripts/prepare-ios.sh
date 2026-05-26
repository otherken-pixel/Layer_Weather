#!/usr/bin/env bash
# Alias for fix-ios-build.sh (npm run ios:prepare).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/fix-ios-build.sh"
