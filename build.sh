#!/bin/bash
# Build script for TabCloser
# Produces dist/chrome/, dist/firefox/, and dist/safari/ with browser-specific manifests
# Version is read from the root manifest.json (single source of truth)
#
# The safari/ output is the layout consumed by Xcode's safari-web-extension-converter:
#   xcrun safari-web-extension-converter dist/safari

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
SHARED_FILES="background.js patterns.js popup.html popup.js options.js options.html"
SHARED_DIRS="icons images"
TARGETS="chrome firefox safari"

# Read version from root manifest.json
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SCRIPT_DIR/manifest.json")
echo "Building TabCloser v${VERSION}..."

# Clean previous builds
rm -rf "$DIST_DIR"

for target in $TARGETS; do
  mkdir -p "$DIST_DIR/$target"
  for file in $SHARED_FILES; do
    cp "$SCRIPT_DIR/$file" "$DIST_DIR/$target/$file"
  done
  for dir in $SHARED_DIRS; do
    cp -r "$SCRIPT_DIR/$dir" "$DIST_DIR/$target/$dir"
  done
done

# Chrome and Safari manifests: service_worker background (background.js pulls in
# patterns.js via importScripts)
for target in chrome safari; do
cat > "$DIST_DIR/$target/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "TabCloser",
  "version": "${VERSION}",
  "description": "Automatically close leftover tabs from services like Figma, Spotify, Zoom and other commonly redirected URLs.",
  "homepage_url": "https://tinyextensions.com/tabcloser",
  "permissions": [
    "tabs",
    "storage",
    "alarms"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
EOF
done

# Firefox manifest: event page (scripts array — patterns.js must load before
# background.js, since event pages have no importScripts), gecko settings
cat > "$DIST_DIR/firefox/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "TabCloser",
  "version": "${VERSION}",
  "description": "Automatically close leftover tabs from services like Figma, Spotify, Zoom and other commonly redirected URLs.",
  "homepage_url": "https://tinyextensions.com/tabcloser",
  "permissions": [
    "tabs",
    "storage",
    "alarms"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "background": {
    "scripts": ["patterns.js", "background.js"]
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "tabcloser@sethcottle.com",
      "strict_min_version": "121.0",
      "data_collection_permissions": {
        "required": ["none"],
        "optional": []
      }
    }
  }
}
EOF

echo "Build complete (v${VERSION}):"
echo "  Chrome:  $DIST_DIR/chrome/"
echo "  Firefox: $DIST_DIR/firefox/"
echo "  Safari:  $DIST_DIR/safari/"
