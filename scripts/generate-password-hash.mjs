import crypto from 'node:crypto';

/**
 * Generate a secure PBKDF2-SHA512 password hash for ADMIN_PASSWORD_HASH
 * Usage: node scripts/generate-password-hash.mjs "your_admin_password_here"
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const keylen = 64;
  const digest = 'sha512';

  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return `pbkdf2$${iterations}$${salt}$${derivedKey.toString('hex')}`;
}

const passwordInput = process.argv[2] || 'Diyoration2026!';
const hashResult = hashPassword(passwordInput);

console.log('\n======================================================');
console.log('  Diyoration Admin Password Hash Generator');
console.log('======================================================\n');
console.log(`Password: ${passwordInput}`);
console.log(`ADMIN_PASSWORD_HASH=${hashResult}\n`);
console.log('Copy the ADMIN_PASSWORD_HASH line into your local .env.local file.\n');
