#!/bin/bash
set -euo pipefail

# Script to build the custom AFFiNITe Docker Server Image
# Run from the project root: ./build-docker.sh

echo "=== Building AFFiNITe Server Docker Image ==="

# Step 1: Build Server Native module
echo "[1/4] Building @affine/server-native Rust module..."
yarn workspace @affine/server-native build

# Ensure architecture links exist for Rspack resolver
cd packages/backend/native
ln -sf server-native.node server-native.x64.node 2>/dev/null || true
ln -sf server-native.node server-native.arm64.node 2>/dev/null || true
ln -sf server-native.node server-native.armv7.node 2>/dev/null || true
cd ../../..

# Step 2: Build server NestJS package
echo "[2/4] Building @affine/server NestJS package..."
yarn affine @affine/server build

# Step 3: Build Web Assets for production
echo "[3/4] Building production web assets..."
BUILD_TYPE=stable PUBLIC_PATH="/" yarn build

# Step 4: Build Docker Image
echo "[4/4] Building Docker image 'affinite-server:latest'..."
docker build -f .github/deployment/node/Dockerfile -t affinite-server:latest .

echo "=== Docker build complete! ==="
echo "You can now run it using:"
echo "  docker run -p 3010:3010 affinite-server:latest"
