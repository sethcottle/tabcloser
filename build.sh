#!/bin/bash
# Build script for TabCloser
# Produces dist/chrome/ and dist/firefox/ with browser-specific manifests
# Version is read from the root manifest.json (single source of truth)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
SHARED_FILES="background.js popup.js popup.html options.js options.html"
SHARED_DIRS="icons images"

# Read version from root manifest.json
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SCRIPT_DIR/manifest.json")
echo "Building TabCloser v${VERSION}..."

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/chrome" "$DIST_DIR/firefox"

# Copy shared files to both targets
for file in $SHARED_FILES; do
  cp "$SCRIPT_DIR/$file" "$DIST_DIR/chrome/$file"
  cp "$SCRIPT_DIR/$file" "$DIST_DIR/firefox/$file"
done

# Copy shared directories to both targets
for dir in $SHARED_DIRS; do
  cp -r "$SCRIPT_DIR/$dir" "$DIST_DIR/chrome/$dir"
  cp -r "$SCRIPT_DIR/$dir" "$DIST_DIR/firefox/$dir"
done

# Chrome manifest: service_worker, no gecko settings
cat > "$DIST_DIR/chrome/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "TabCloser",
  "version": "${VERSION}",
  "description": "Automatically close leftover tabs from services like Figma, Spotify, Zoom and other commonly redirected URLs.",
  "permissions": [
    "tabs",
    "storage"
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
  "options_page": "options.html",
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
EOF

# Firefox manifest: scripts array, gecko settings
cat > "$DIST_DIR/firefox/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "TabCloser",
  "version": "${VERSION}",
  "description": "Automatically close leftover tabs from services like Figma, Spotify, Zoom and other commonly redirected URLs.",
  "permissions": [
    "tabs",
    "storage"
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
    "scripts": ["background.js"]
  },
  "options_page": "options.html",
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
