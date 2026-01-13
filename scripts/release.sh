#!/bin/bash
# scripts/release.sh
# Automated release script using GitHub CLI
#
# This script:
# 1. Extracts the version from package.json OR derives it from the branch name
# 2. Builds the Tauri application with all Linux bundles
# 3. Creates a GitHub release with all build artifacts
# 4. Generates release notes automatically from commits
#
# Branch-based versioning:
#   If on a branch like 'v03', 'v12', 'release-v04', etc., the script will:
#   - Convert 'v03' to version '0.3.0'
#   - Convert 'v12' to version '1.2.0'
#   - Convert 'release-v04' to version '0.4.0'
#   Then update package.json and tauri.conf.json automatically
#
# Usage:
#   ./scripts/release.sh           # Create a draft release
#   ./scripts/release.sh --publish # Create and publish immediately

set -e

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if branch name contains version pattern (e.g., v03, v12)
if [[ $BRANCH =~ v([0-9])([0-9]) ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    DERIVED_VERSION="$MAJOR.$MINOR.0"
    
    echo "======================================"
    echo "Branch-based version detected!"
    echo "======================================"
    echo "Branch: $BRANCH"
    echo "Derived version: $DERIVED_VERSION"
    echo ""
    
    # Update package.json
    echo "Updating package.json version to $DERIVED_VERSION..."
    node -e "const pkg = require('./package.json'); pkg.version = '$DERIVED_VERSION'; require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');"
    
    # Update tauri.conf.json
    echo "Updating src-tauri/tauri.conf.json version to $DERIVED_VERSION..."
    node -e "const cfg = require('./src-tauri/tauri.conf.json'); cfg.version = '$DERIVED_VERSION'; require('fs').writeFileSync('./src-tauri/tauri.conf.json', JSON.stringify(cfg, null, 2) + '\n');"
    
    echo "✓ Version files updated"
    echo ""
    
    VERSION="$DERIVED_VERSION"
else
    # Extract version from package.json
    VERSION=$(node -p "require('./package.json').version")
    echo "Using version from package.json: $VERSION"
fi

TAG="v$VERSION"

echo "======================================"
echo "NanoChat Desktop Release Process"
echo "======================================"
echo "Version: $VERSION"
echo "Tag: $TAG"
echo ""

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Error: Tag $TAG already exists!"
    echo "Please update the version in package.json and src-tauri/tauri.conf.json"
    exit 1
fi

# Verify version matches in tauri.conf.json
TAURI_VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version")
if [ "$VERSION" != "$TAURI_VERSION" ]; then
    echo "Error: Version mismatch!"
    echo "  package.json: $VERSION"
    echo "  tauri.conf.json: $TAURI_VERSION"
    echo "Please ensure both files have the same version."
    exit 1
fi

echo "✓ Version verified in both package.json and tauri.conf.json"
echo ""

# Build the project
echo "Building application..."
./build.sh

echo ""
echo "Build complete!"
echo ""

# Check for build artifacts
APPIMAGE_PATH="src-tauri/target/release/bundle/appimage"
DEB_PATH="src-tauri/target/release/bundle/deb"
RPM_PATH="src-tauri/target/release/bundle/rpm"

ARTIFACTS=()

# Collect all artifacts
if [ -d "$APPIMAGE_PATH" ] && [ "$(ls -A $APPIMAGE_PATH/*.AppImage 2>/dev/null)" ]; then
    ARTIFACTS+=($APPIMAGE_PATH/*.AppImage)
    echo "✓ Found AppImage artifacts"
fi

if [ -d "$DEB_PATH" ] && [ "$(ls -A $DEB_PATH/*.deb 2>/dev/null)" ]; then
    ARTIFACTS+=($DEB_PATH/*.deb)
    echo "✓ Found DEB artifacts"
fi

if [ -d "$RPM_PATH" ] && [ "$(ls -A $RPM_PATH/*.rpm 2>/dev/null)" ]; then
    ARTIFACTS+=($RPM_PATH/*.rpm)
    echo "✓ Found RPM artifacts"
fi

if [ ${#ARTIFACTS[@]} -eq 0 ]; then
    echo "Error: No build artifacts found!"
    exit 1
fi

echo ""
echo "Artifacts to upload:"
for artifact in "${ARTIFACTS[@]}"; do
    echo "  - $(basename $artifact)"
done
echo ""

# Determine if this should be a draft or published release
RELEASE_FLAGS="--draft"
if [ "$1" == "--publish" ]; then
    RELEASE_FLAGS=""
    echo "Creating published release..."
else
    echo "Creating draft release (use --publish to publish immediately)..."
fi

# Create the GitHub Release
gh release create "$TAG" \
  "${ARTIFACTS[@]}" \
  --title "NanoChat Desktop $TAG" \
  --generate-notes \
  $RELEASE_FLAGS

echo ""
echo "======================================"
echo "Release $TAG created successfully!"
echo "======================================"

if [ "$1" != "--publish" ]; then
    echo ""
    echo "The release is currently in DRAFT mode."
    echo "Review it on GitHub and publish when ready:"
    echo "  gh release edit $TAG --draft=false"
    echo "  or visit: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases"
fi

echo ""