/**
 * Test script for Push Notification functionality
 * Run with: node test-push-notifications.js
 *
 * Note: Full E2E testing of push notifications requires a browser environment
 * This script validates the backend components and provides a manual test plan
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Push Notification System...\n');

// Track test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: []
};

function addCheck(name, passed, message = '') {
  const status = passed ? '✅' : '❌';
  console.log(`   ${status} ${name}`);
  if (message) {
    console.log(`      ${message}`);
  }

  results.checks.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function addWarning(name, message = '') {
  console.log(`   ⚠️  ${name}`);
  if (message) {
    console.log(`      ${message}`);
  }
  results.warnings++;
}

// ============================================================================
// 1. COMPONENT VERIFICATION
// ============================================================================

console.log('📦 1. Component Verification\n');

// Check if push service utility exists
const pushServicePath = path.join(__dirname, 'TaxDeedFlow', 'src', 'lib', 'notifications', 'push-service.ts');
const pushServiceExists = fs.existsSync(pushServicePath);
addCheck('Push service utility exists', pushServiceExists);

if (pushServiceExists) {
  const pushServiceContent = fs.readFileSync(pushServicePath, 'utf8');

  // Verify key functions
  addCheck(
    'isNotificationSupported function',
    pushServiceContent.includes('export const isNotificationSupported')
  );

  addCheck(
    'requestNotificationPermission function',
    pushServiceContent.includes('export async function requestNotificationPermission')
  );

  addCheck(
    'subscribeToPushNotifications function',
    pushServiceContent.includes('export async function subscribeToPushNotifications')
  );

  addCheck(
    'unsubscribeFromPushNotifications function',
    pushServiceContent.includes('export async function unsubscribeFromPushNotifications')
  );

  addCheck(
    'showLocalNotification function',
    pushServiceContent.includes('export async function showLocalNotification')
  );

  addCheck(
    'sendTestNotification function',
    pushServiceContent.includes('export async function sendTestNotification')
  );
}

// Check if NotificationSettings component exists
console.log('\n📦 2. NotificationSettings Component\n');

const notificationSettingsPath = path.join(__dirname, 'TaxDeedFlow', 'src', 'components', 'auctions', 'NotificationSettings.tsx');
const notificationSettingsExists = fs.existsSync(notificationSettingsPath);
addCheck('NotificationSettings component exists', notificationSettingsExists);

if (notificationSettingsExists) {
  const componentContent = fs.readFileSync(notificationSettingsPath, 'utf8');

  addCheck(
    'Uses push-service utility',
    componentContent.includes('from "@/lib/notifications/push-service"')
  );

  addCheck(
    'Has enable/disable toggle',
    componentContent.includes('handleEnableNotifications') ||
    componentContent.includes('handleDisableNotifications')
  );

  addCheck(
    'Has notification preferences UI',
    componentContent.includes('notifyRegistrationDeadline') &&
    componentContent.includes('notifyAuctionDate')
  );

  addCheck(
    'Has reminder timing options',
    componentContent.includes('notifyDaysBefore')
  );

  addCheck(
    'Makes API call to subscribe endpoint',
    componentContent.includes('/api/auctions/notifications/subscribe')
  );
}

// Check if API endpoint exists
console.log('\n📦 3. API Endpoint Verification\n');

const apiPath = path.join(__dirname, 'TaxDeedFlow', 'src', 'app', 'api', 'auctions', 'notifications', 'subscribe', 'route.ts');
const apiExists = fs.existsSync(apiPath);
addCheck('Subscribe API endpoint exists', apiExists);

if (apiExists) {
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  addCheck(
    'POST handler implemented',
    apiContent.includes('export async function POST')
  );

  addCheck(
    'GET handler implemented',
    apiContent.includes('export async function GET')
  );

  addCheck(
    'Validates subscription object',
    apiContent.includes('subscription.endpoint') &&
    apiContent.includes('subscription.keys')
  );

  addCheck(
    'Handles subscribe action',
    apiContent.includes("action === 'subscribe'")
  );

  addCheck(
    'Handles unsubscribe action',
    apiContent.includes("action === 'unsubscribe'")
  );

  addCheck(
    'Stores preferences',
    apiContent.includes('preferences') ||
    apiContent.includes('notifyRegistrationDeadline')
  );
}

// Check integration in auctions page
console.log('\n📦 4. Auctions Page Integration\n');

const auctionsPagePath = path.join(__dirname, 'TaxDeedFlow', 'src', 'app', 'auctions', 'page.tsx');
const auctionsPageExists = fs.existsSync(auctionsPagePath);
addCheck('Auctions page exists', auctionsPageExists);

if (auctionsPageExists) {
  const pageContent = fs.readFileSync(auctionsPagePath, 'utf8');

  addCheck(
    'NotificationSettings component imported',
    pageContent.includes('NotificationSettings') &&
    pageContent.includes('from "@/components/auctions/NotificationSettings"')
  );

  addCheck(
    'NotificationSettings component rendered',
    pageContent.includes('<NotificationSettings')
  );
}

// ============================================================================
// 5. SERVICE WORKER VERIFICATION
// ============================================================================

console.log('\n📦 5. Service Worker Configuration\n');

// Check for service worker file
const swPath = path.join(__dirname, 'TaxDeedFlow', 'public', 'sw.js');
const swExists = fs.existsSync(swPath);

if (swExists) {
  addCheck('Service worker file exists', true);
  const swContent = fs.readFileSync(swPath, 'utf8');

  addCheck(
    'Push event handler',
    swContent.includes('push') && swContent.includes('event')
  );
} else {
  addWarning(
    'Service worker file not found',
    'Push notifications will work with default browser SW, but custom SW recommended'
  );
}

// Check for manifest.json
const manifestPath = path.join(__dirname, 'TaxDeedFlow', 'public', 'manifest.json');
const manifestExists = fs.existsSync(manifestPath);

if (manifestExists) {
  addCheck('Web manifest exists', true);
} else {
  addWarning(
    'Web manifest not found',
    'manifest.json recommended for PWA features'
  );
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('📊 Test Summary\n');
console.log(`   ✅ Passed: ${results.passed}`);
console.log(`   ❌ Failed: ${results.failed}`);
console.log(`   ⚠️  Warnings: ${results.warnings}`);
console.log('='.repeat(70));

if (results.failed === 0) {
  console.log('\n✅ All automated checks passed!');
  console.log('\n📋 Next Steps: Manual Browser Testing Required\n');
  console.log('Push notifications require browser interaction and cannot be fully automated.');
  console.log('Please follow the manual test plan in PUSH-NOTIFICATION-TEST-PLAN.md\n');

  console.log('Quick Manual Test Steps:');
  console.log('1. Start dev server: cd TaxDeedFlow && npm run dev');
  console.log('2. Navigate to: http://localhost:3000/auctions');
  console.log('3. Find "Notification Settings" section');
  console.log('4. Click "Enable Notifications" button');
  console.log('5. Grant browser permission when prompted');
  console.log('6. Verify test notification appears');
  console.log('7. Check browser DevTools → Application → Service Workers');
  console.log('8. Check browser DevTools → Console for any errors\n');

  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please review the issues above.');
  console.log('\nFailed Checks:');
  results.checks
    .filter(c => !c.passed)
    .forEach(c => {
      console.log(`   - ${c.name}`);
      if (c.message) {
        console.log(`     ${c.message}`);
      }
    });
  process.exit(1);
}
