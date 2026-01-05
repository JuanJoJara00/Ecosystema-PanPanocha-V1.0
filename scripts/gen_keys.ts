import { generateKeyPairSync } from 'crypto';

console.log("Generating Ed25519 Key Pair for PowerSync...\n");

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

console.log("=== PUBLIC KEY (Upload this to PowerSync Dashboard > Credentials) ===");
console.log(publicKey);
console.log("====================================================================\n");

console.log("=== PRIVATE KEY (Paste this in apps/portal/.env.local) ===");
// Escape newlines for .env if needed, but usually quoted multiline works in modern env parsers.
// For safety, we'll suggest strict quoting.
console.log(`POWERSYNC_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
console.log("====================================================================\n");

console.log("INSTRUCTIONS:");
console.log("1. Copy the PUBLIC KEY above.");
console.log("2. Go to your PowerSync Dashboard > Select Project > Right Click 'Edit Instance' or find 'Credentials' tab.");
console.log("3. Create a new Key, give it a label (e.g. 'portal-key'), and paste the PUBLIC KEY.");
console.log("4. Copy the PRIVATE KEY line above (the one starting with POWERSYNC_PRIVATE_KEY=...).");
console.log("5. Paste it into your 'apps/portal/.env.local' file, replacing the existing entry.");
console.log("6. Restart the Portal.");
