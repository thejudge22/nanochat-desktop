#!/bin/bash
# Helper script to build Tauri application with correct environment variables
#
# Usage:
#   ./build.sh                    # Build all bundle types (deb, rpm, appimage)
#   ./build.sh --bundles appimage # Build AppImage only
#   ./build.sh --bundles deb      # Build deb only
#
# Flatpak builds:
#   Flatpak is NOT supported directly by Tauri's bundle system.
#   To build Flatpak, use flatpak-builder directly:
#   flatpak-builder --user --install --force-clean build-flatpak org.nanochat.desktop.json
#
# This script sets environment variables needed to work around issues on:
# - Fedora 42+ and other modern Linux distributions
# - Toolbx/Distrobox containers
# - Systems with only libfuse3 (no libfuse2)
#
# Issues addressed:
# 1. APPIMAGE_EXTRACT_AND_RUN=1 - Allows AppImages to run without libfuse2 by extracting first
# 2. NO_STRIP=1 - Skips stripping libraries that use newer ELF features (.relr.dyn sections)
#    which are incompatible with the older strip tool bundled in linuxdeploy

set -e

# AppImage build environment variables
export APPIMAGE_EXTRACT_AND_RUN=1  # Run AppImages without FUSE (extracts to temp dir)
export NO_STRIP=1                   # Skip stripping to avoid .relr.dyn section errors

# PKG_CONFIG_PATH for finding system libraries
export PKG_CONFIG_PATH="${PKG_CONFIG_PATH:+$PKG_CONFIG_PATH:}/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig"

echo "Building Tauri application with Linux workarounds..."
echo "  APPIMAGE_EXTRACT_AND_RUN=1 (for AppImage libfuse2 compatibility)"
echo "  NO_STRIP=1 (for modern ELF .relr.dyn section compatibility)"
echo ""

# Pass all arguments to tauri build
npx tauri build "$@"