#!/bin/bash
# Helper script to run Tauri dev with correct PKG_CONFIG_PATH
# Required due to Homebrew pkg-config not searching system directories by default

export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig:/home/linuxbrew/.linuxbrew/lib/pkgconfig:/home/linuxbrew/.linuxbrew/share/pkgconfig"

npm run tauri:dev
