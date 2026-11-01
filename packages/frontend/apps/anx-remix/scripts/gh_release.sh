#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Extract version from pubspec.yaml
VERSION=$(grep '^version: ' "$REPO_DIR/pubspec.yaml" | sed 's/version: //')
# Clean up version string (remove everything after + for the release tag/title, e.g., 1.15.3+3 -> 1.15.3)
TAG_VERSION=$(echo "$VERSION" | cut -d'+' -f1)
TAG="v$TAG_VERSION"

echo "=== Preparing GitHub Release for $TAG ==="

# Check if gh command is installed
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is not installed."
  echo "Please install it and run 'gh auth login' first."
  exit 1
fi

# Find built files in root directory
FILES=()
for file in "$REPO_DIR"/Anx_Remix-*.apk "$REPO_DIR"/Anx_Remix-x86_64.AppImage; do
  if [ -f "$file" ]; then
    FILES+=("$file")
  fi
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "Error: No release assets (APKs or AppImage) found in root directory."
  exit 1
fi

echo "Assets to upload:"
for file in "${FILES[@]}"; do
  echo "  - $(basename "$file")"
done

NOTES_FILE="$REPO_DIR/RELEASE_NOTES.md"

# If the release notes file does not exist, create it with a template
if [ ! -f "$NOTES_FILE" ]; then
  cat << EOF > "$NOTES_FILE"
# 📦 Anx Remix $TAG

Welcome to the new release of Anx Remix!

## 🚀 Key Features
- **Feature**: 

## 🔧 Fixes & Improvements
- **Fix**: 

---
*Thank you for using Anx Remix!*
EOF
fi

# Prompt user to edit release notes
echo "--------------------------------------------------------"
echo "You can now edit the release notes for $TAG."
read -p "Would you like to open the editor? (y/n) [y]: " edit_notes
edit_notes=${edit_notes:-y}

if [[ "$edit_notes" =~ ^[Yy]$ ]]; then
  # Find available editor: nvim -> $EDITOR -> nano -> vim -> vi
  EDITOR_CMD=""
  if command -v nvim &> /dev/null; then
    EDITOR_CMD="nvim"
  elif [ -n "$EDITOR" ] && command -v "$EDITOR" &> /dev/null; then
    EDITOR_CMD="$EDITOR"
  elif command -v nano &> /dev/null; then
    EDITOR_CMD="nano"
  elif command -v vim &> /dev/null; then
    EDITOR_CMD="vim"
  else
    EDITOR_CMD="vi"
  fi

  echo "Opening $NOTES_FILE with $EDITOR_CMD..."
  # Open editor directly in terminal
  "$EDITOR_CMD" "$NOTES_FILE"
fi

echo "--------------------------------------------------------"
echo "Release notes preview:"
cat "$NOTES_FILE"
echo "--------------------------------------------------------"

# Check if release already exists
if gh release view "$TAG" &>/dev/null; then
  echo "Release $TAG already exists on GitHub."
  
  read -p "Do you want to update the existing release's notes/description on GitHub? (y/n) [y]: " update_notes
  update_notes=${update_notes:-y}
  
  read -p "Do you want to re-upload and overwrite (clobber) the assets? (y/n) [y]: " update_assets
  update_assets=${update_assets:-y}
  
  if [[ "$update_notes" =~ ^[Yy]$ ]]; then
    echo "Updating release notes on GitHub..."
    gh release edit "$TAG" --notes-file "$NOTES_FILE"
  fi
  
  if [[ "$update_assets" =~ ^[Yy]$ ]]; then
    echo "Uploading assets to existing release..."
    gh release upload "$TAG" "${FILES[@]}" --clobber
  fi
else
  # Confirm release creation
  read -p "Do you want to proceed and publish the GitHub release? (y/n) [y]: " confirm_release
  confirm_release=${confirm_release:-y}

  if [[ ! "$confirm_release" =~ ^[Yy]$ ]]; then
    echo "Release creation cancelled by user."
    exit 0
  fi

  echo "Creating new release..."
  gh release create "$TAG" "${FILES[@]}" --title "$TAG" --notes-file "$NOTES_FILE"
fi

# Ask if they want to clean up RELEASE_NOTES.md
read -p "Clean up (delete) local RELEASE_NOTES.md? (y/n) [y]: " cleanup_notes
cleanup_notes=${cleanup_notes:-y}
if [[ "$cleanup_notes" =~ ^[Yy]$ ]]; then
  rm -f "$NOTES_FILE"
  echo "Cleaned up local release notes file."
fi

echo "=== GitHub Release process completed successfully! ==="
