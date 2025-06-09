#!/bin/bash
# Build script for Clipboard Watchdog Chrome Extension
# Zips only the necessary files for Chrome Web Store submission, with versioned filename

# Extract version from manifest.json
VERSION=$(grep '"version":' manifest.json | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')
ZIP_NAME="clipboard_watchdog_v${VERSION}.zip"

# Remove any previous build
rm -f $ZIP_NAME

# List of files and folders to include
INCLUDE_FILES=(
  manifest.json
  background.js
  content.js
  popup.js
  injected.js
  block-clipboard.js
  popup.html
  popup.css
  icons
)

# Create the zip, excluding test HTML files and screenshots
zip -r $ZIP_NAME ${INCLUDE_FILES[@]} -x "clip.html" "clip-iframe.html" "screenshots/*" "test/*"

echo "Build complete: $ZIP_NAME" 