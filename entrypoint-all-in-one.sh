#!/bin/bash
set -e

echo "=== Starting AFFiNITe All-In-One Container ==="

# Set up data directories
DATA_DIR="/data"
PG_DATA="${DATA_DIR}/postgres"
STORAGE_DIR="${DATA_DIR}/storage"
CONFIG_DIR="${DATA_DIR}/config"

mkdir -p "$PG_DATA" "$STORAGE_DIR" "$CONFIG_DIR"
chown -R postgres:postgres "$PG_DATA"

DB_USER="${DB_USER:-affine_user}"
DB_PASSWORD="${DB_PASSWORD:-affine_pass}"
DB_NAME="${DB_NAME:-affine_db}"
PG_BIN="/usr/lib/postgresql/15/bin"

# 1. Initialize PostgreSQL Data Directory if not initialized
if [ ! -f "${PG_DATA}/PG_VERSION" ]; then
  echo "--- Initializing PostgreSQL Data Directory in ${PG_DATA} ---"
  su - postgres -c "${PG_BIN}/initdb -D '${PG_DATA}'"
  
  # Start temporary Postgres for database & user creation
  su - postgres -c "${PG_BIN}/pg_ctl -D '${PG_DATA}' -l /tmp/pg_init.log start"
  
  echo "--- Provisioning PostgreSQL database '${DB_NAME}' and user '${DB_USER}' ---"
  until su - postgres -c "pg_isready"; do
    sleep 1
  done
  
  su - postgres -c "psql -c \"CREATE USER ${DB_USER} WITH SUPERUSER PASSWORD '${DB_PASSWORD}';\""
  su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\""
  
  su - postgres -c "${PG_BIN}/pg_ctl -D '${PG_DATA}' stop"
  echo "--- PostgreSQL initialized successfully ---"
fi

# 2. Start PostgreSQL in background
echo "--- Starting PostgreSQL ---"
su - postgres -c "${PG_BIN}/postgres -D '${PG_DATA}'" &
PG_PID=$!

echo "Waiting for PostgreSQL readiness..."
until su - postgres -c "pg_isready"; do
  sleep 1
done

# 3. Start Redis in background
echo "--- Starting Redis ---"
redis-server --daemonize yes

# 4. Set Environment Variables for AFFiNITe Node.js Server
export NODE_ENV=production
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
export REDIS_SERVER_HOST="127.0.0.1"
export REDIS_SERVER_PORT="6379"
export AFFINE_SERVER_PORT="${PORT:-5320}"
export AFFINE_CONFIG_PATH="${CONFIG_DIR}"
export AFFINE_SERVER_EXTERNAL_URL="${AFFINE_EXTERNAL_URL:-http://localhost:5320}"

echo "--- Starting AFFiNITe Node.js Server on port ${AFFINE_SERVER_PORT} ---"
echo "DATABASE_URL=${DATABASE_URL}"
echo "EXTERNAL_URL=${AFFINE_SERVER_EXTERNAL_URL}"

exec node ./dist/main.js
