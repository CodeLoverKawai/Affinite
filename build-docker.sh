#!/bin/bash
set -euo pipefail

# Script to build and push the custom AFFiNITe Docker Server Image to Docker Hub
# Run from the project root: ./build-docker.sh

DOCKER_USER="rousseau"
IMAGE_NAME="affinite"

echo "=== Building AFFiNITe Server Docker Image ==="

# Step 1: Detect current version from package.json
VERSION=$(node -p "require('./packages/frontend/core/package.json').version")
echo "Detected Version: $VERSION"

# Step 2: Build Server Native module
echo ""
echo "--- [1/5] Building @affine/server-native Rust module ---"
yarn workspace @affine/server-native build

# Ensure architecture links exist for Rspack resolver
cd packages/backend/native
ln -sf server-native.node server-native.x64.node 2>/dev/null || true
ln -sf server-native.node server-native.arm64.node 2>/dev/null || true
ln -sf server-native.node server-native.armv7.node 2>/dev/null || true
cd ../../..

# Step 3: Build server NestJS package
echo ""
echo "--- [2/5] Building @affine/server NestJS package ---"
yarn affine @affine/server build

# Step 4: Build Web Assets for production
echo ""
echo "--- [3/5] Building production web assets ---"
BUILD_TYPE=stable PUBLIC_PATH="/" yarn affine @affine/web build
BUILD_TYPE=stable PUBLIC_PATH="/" yarn affine @affine/admin build
BUILD_TYPE=stable PUBLIC_PATH="/" yarn affine @affine/mobile build

# Step 5: Build Docker Image
echo ""
echo "--- [4/5] Building Docker image '$DOCKER_USER/$IMAGE_NAME' ---"
docker build -f .github/deployment/node/Dockerfile \
  -t "$DOCKER_USER/$IMAGE_NAME:latest" \
  -t "$DOCKER_USER/$IMAGE_NAME:v$VERSION" .

# Step 6: Push Docker Image to Docker Hub
echo ""
echo "--- [5/5] Pushing Docker image to Docker Hub ---"
echo "Pushing $DOCKER_USER/$IMAGE_NAME:latest..."
docker push "$DOCKER_USER/$IMAGE_NAME:latest"

echo "Pushing $DOCKER_USER/$IMAGE_NAME:v$VERSION..."
docker push "$DOCKER_USER/$IMAGE_NAME:v$VERSION"

echo ""
echo "=== Docker build & push complete! ==="
echo "Images pushed successfully to Docker Hub:"
echo "  - $DOCKER_USER/$IMAGE_NAME:latest"
echo "  - $DOCKER_USER/$IMAGE_NAME:v$VERSION"
