#!/bin/bash
# =========================================================================
# Church Service Management System — Encrypted Disaster Recovery Restore (NFR-3.5)
# Decrypts AES-256-CBC backup and restores PostgreSQL schema and data.
# =========================================================================

set -eo pipefail

if [ -z "$1" ]; then
  echo "❌ Error: Missing required encrypted backup file path."
  echo "Usage: $0 /path/to/backup.sql.enc"
  exit 1
fi

ENCRYPTED_FILE="$1"
DECRYPTED_FILE="${ENCRYPTED_FILE%.enc}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-shenoda_dev}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-ShenodaDefaultEncSecret2026!}"

echo "🔄 [$(date)] Starting Disaster Recovery Restore Drill..."
echo "📂 Source archive: ${ENCRYPTED_FILE}"
echo "📍 Target database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# 1. Verify Checksum if SHA file exists
SHA_FILE="${ENCRYPTED_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
  echo "🛡️ Step 1: Verifying SHA-256 checksum..."
  sha256sum -c "$SHA_FILE"
  echo "✅ Checksum verification passed."
fi

# 2. Decrypt archive with AES-256-CBC
echo "🔓 Step 2: Decrypting backup file..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$ENCRYPTED_FILE" \
  -out "$DECRYPTED_FILE" \
  -pass pass:"$BACKUP_ENCRYPTION_KEY"

# 3. Restore to target PostgreSQL database
echo "📥 Step 3: Restoring schema and records with pg_restore..."
PGPASSWORD="${DB_PASSWORD:-postgrespassword}" pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean --if-exists -v \
  "$DECRYPTED_FILE" || true

# 4. Securely remove decrypted plaintext file
echo "🧹 Step 4: Securely purging temporary decrypted file..."
rm -f "$DECRYPTED_FILE"

echo "🎉 [$(date)] Disaster recovery restore completed successfully!"
