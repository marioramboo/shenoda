#!/bin/bash
# =========================================================================
# Church Service Management System — Automated Encrypted Backup (NFR-3.5)
# Generates AES-256-CBC encrypted PostgreSQL backups for offsite disaster recovery.
# =========================================================================

set -eo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/csms_dump_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
SHA_FILE="${ENCRYPTED_FILE}.sha256"

# Load DB connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-shenoda_dev}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-ShenodaDefaultEncSecret2026!}"

echo "🔒 [$(date)] Starting automated encrypted database backup..."
echo "📍 Target database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# 1. Dump PostgreSQL database in custom archive format
echo "📦 Step 1: Exporting pg_dump custom archive..."
PGPASSWORD="${DB_PASSWORD:-postgrespassword}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c -b -v \
  -f "$BACKUP_FILE"

# 2. Encrypt with AES-256-CBC using PBKDF2 salt and strong key
echo "🔐 Step 2: Encrypting with OpenSSL AES-256-CBC (PBKDF2)..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "$BACKUP_FILE" \
  -out "$ENCRYPTED_FILE" \
  -pass pass:"$BACKUP_ENCRYPTION_KEY"

# 3. Calculate SHA-256 checksum for tamper detection
echo "🛡️ Step 3: Computing cryptographic checksum..."
sha256sum "$ENCRYPTED_FILE" > "$SHA_FILE"

# 4. Securely remove the plaintext dump file
echo "🧹 Step 4: Securely removing plaintext dump..."
rm -f "$BACKUP_FILE"

# 5. Optional offsite upload to AWS S3 / Compatible Object Storage
if [ -n "$BACKUP_BUCKET" ]; then
  echo "☁️ Step 5: Uploading encrypted backup to offsite storage: s3://${BACKUP_BUCKET}/backups/..."
  aws s3 cp "$ENCRYPTED_FILE" "s3://${BACKUP_BUCKET}/backups/"
  aws s3 cp "$SHA_FILE" "s3://${BACKUP_BUCKET}/backups/"
  echo "✅ Offsite upload successful."
else
  echo "ℹ️ Step 5: BACKUP_BUCKET not set. Encrypted backup preserved locally at ${ENCRYPTED_FILE}"
fi

echo "🎉 [$(date)] Backup and encryption completed successfully!"
echo "📄 Encrypted artifact: ${ENCRYPTED_FILE}"
echo "🔑 Checksum: $(cat "$SHA_FILE")"
