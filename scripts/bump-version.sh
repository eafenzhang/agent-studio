#!/bin/bash
# Version bump script for Agent Studio
# Usage: ./scripts/bump-version.sh [patch|minor|major]
# Default: patch (1.0.0 -> 1.0.1)

set -e

MODE="${1:-patch}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Read current version from React package.json
CURRENT_VERSION=$(node -p "require('$ROOT_DIR/agent-studio-react/package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$MODE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "New version: $NEW_VERSION"

# Update all version files
for f in \
  "$ROOT_DIR/agent-studio-react/package.json" \
  "$ROOT_DIR/agent-studio-tauri/package.json" \
  "$ROOT_DIR/agent-studio-tauri/src-tauri/Cargo.toml" \
  "$ROOT_DIR/agent-studio-tauri/src-tauri/tauri.conf.json"; do
  if [ -f "$f" ]; then
    sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" "$f"
    echo "  Updated: $f"
  fi
done

echo ""
echo "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"
echo "Run: git add -A && git commit -m \"chore: bump v$CURRENT_VERSION to v$NEW_VERSION\" && git push"
