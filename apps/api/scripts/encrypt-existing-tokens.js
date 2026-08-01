/**
 * One-time migration: Encrypt all existing plaintext OAuth tokens in the database.
 *
 * Run once after deploying the CRIT-01 encryption fix:
 *   node apps/api/scripts/encrypt-existing-tokens.js
 *
 * Safe to re-run — uses isEncrypted() heuristic to skip already-encrypted rows.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'OAUTH_TOKEN_ENCRYPTION_KEY is not set in your environment. ' +
        'Make sure to run this script from the apps/api directory with the .env loaded.',
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `OAUTH_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Got ${keyHex.length}.`,
    );
  }
  return Buffer.from(keyHex, 'hex');
}

function encrypt(key, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

function isEncrypted(value) {
  if (!value) return false;
  const parts = value.split(':');
  return (
    parts.length === 3 &&
    parts[0].length === 24 &&
    parts[1].length === 32 &&
    /^[0-9a-f]+$/i.test(parts[0])
  );
}

async function main() {
  // Manually load .env file since dotenv may not be installed as a direct dep
  const envPath = require('path').join(__dirname, '../.env');
  const fs = require('fs');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }

  const key = getKey();
  const prisma = new PrismaClient();

  try {
    const connections = await prisma.oAuthConnection.findMany();
    console.log(`Found ${connections.length} OAuth connection(s) to inspect.`);

    let migrated = 0;
    let skipped = 0;

    for (const conn of connections) {
      const accessNeedsEncryption = !isEncrypted(conn.accessToken);
      const refreshNeedsEncryption =
        conn.refreshToken && !isEncrypted(conn.refreshToken);

      if (!accessNeedsEncryption && !refreshNeedsEncryption) {
        console.log(
          `  [SKIP] Connection ${conn.id} (${conn.provider}) — already encrypted.`,
        );
        skipped++;
        continue;
      }

      const updateData = {};
      if (accessNeedsEncryption) {
        updateData.accessToken = encrypt(key, conn.accessToken);
        console.log(
          `  [ENCRYPT] Connection ${conn.id} (${conn.provider}) — accessToken`,
        );
      }
      if (refreshNeedsEncryption) {
        updateData.refreshToken = encrypt(key, conn.refreshToken);
        console.log(
          `  [ENCRYPT] Connection ${conn.id} (${conn.provider}) — refreshToken`,
        );
      }

      await prisma.oAuthConnection.update({
        where: { id: conn.id },
        data: updateData,
      });

      migrated++;
    }

    console.log(`\nMigration complete.`);
    console.log(`  Encrypted: ${migrated} connection(s)`);
    console.log(`  Skipped (already encrypted): ${skipped} connection(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
