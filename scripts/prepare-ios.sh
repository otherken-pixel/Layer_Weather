#!/usr/bin/env bash
# Full iOS setup: npm run ios:prepare
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/fix-ios-build.sh"
