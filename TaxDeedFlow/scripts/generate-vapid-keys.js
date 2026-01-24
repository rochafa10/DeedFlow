/**
 * Generate VAPID Keys for Push Notifications
 *
 * Run this script to generate VAPID public/private key pair for Web Push API
 * Add the generated keys to your .env.local file
 *
 * Usage:
 *   node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('\n🔑 Generating VAPID Keys for Push Notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('✅ VAPID Keys Generated Successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Add these to your .env.local file:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n# VAPID Keys for Push Notifications');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log('VAPID_SUBJECT=mailto:support@taxdeedflow.com\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⚠️  IMPORTANT SECURITY NOTES:\n');
  console.log('1. ✅ Public Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):');
  console.log('   - Safe to expose to client');
  console.log('   - Included in frontend bundle');
  console.log('   - Used by browser for subscription\n');

  console.log('2. 🔒 Private Key (VAPID_PRIVATE_KEY):');
  console.log('   - NEVER expose to client (no NEXT_PUBLIC_ prefix)');
  console.log('   - Server-side only');
  console.log('   - Used to sign push notifications');
  console.log('   - Keep secure like a password\n');

  console.log('3. 📧 Subject (VAPID_SUBJECT):');
  console.log('   - Your contact email (mailto:) or website URL (https://)');
  console.log('   - Used by push services to contact you if needed\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Next Steps:\n');
  console.log('1. Copy the environment variables above');
  console.log('2. Paste into TaxDeedFlow/.env.local');
  console.log('3. Restart your development server: npm run dev');
  console.log('4. Verify configuration: curl http://localhost:3000/api/notifications/test\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🧪 Quick Test Commands:\n');
  console.log('# Check VAPID configuration');
  console.log('curl http://localhost:3000/api/notifications/test\n');
  console.log('# Send test notification');
  console.log('curl -X POST http://localhost:3000/api/notifications/test \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"title":"Test","body":"Hello from Tax Deed Flow!"}\'\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Save to file for easy reference (optional)
  const fs = require('fs');
  const path = require('path');
  const envExample = `# VAPID Keys for Push Notifications
# Generated: ${new Date().toISOString()}

# Public key - Safe to expose to client
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}

# Private key - NEVER expose to client (server-side only)
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}

# Subject - Contact email or website URL
VAPID_SUBJECT=mailto:support@taxdeedflow.com
`;

  const outputPath = path.join(__dirname, 'vapid-keys.txt');
  fs.writeFileSync(outputPath, envExample);
  console.log(`💾 Keys also saved to: ${outputPath}`);
  console.log('   (Delete this file after copying to .env.local)\n');

} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}
