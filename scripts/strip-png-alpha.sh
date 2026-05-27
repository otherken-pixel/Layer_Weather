#!/usr/bin/env bash
# Remove PNG alpha channel (required for Apple App Store 1024×1024 app icons).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: strip-png-alpha.sh <input.png> <output.png>" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

[[ -f "$INPUT" ]] || { echo "ERROR: Missing $INPUT" >&2; exit 1; }

mkdir -p "$(dirname "$OUTPUT")"
TMP="$(mktemp "${TMPDIR:-/tmp}/strip-png-alpha.XXXXXX.png")"
trap 'rm -f "$TMP"' EXIT

(cd "$ROOT" && npx --yes sharp-cli -i "$INPUT" -o "$TMP" removeAlpha >/dev/null)
mv "$TMP" "$OUTPUT"
trap - EXIT
