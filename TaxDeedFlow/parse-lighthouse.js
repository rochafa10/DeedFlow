const report = require('./lighthouse-report.json');

console.log('=== LIGHTHOUSE PWA AUDIT RESULTS ===\n');

// Overall category scores
console.log('CATEGORY SCORES:');
Object.keys(report.categories).forEach(cat => {
  const score = Math.round(report.categories[cat].score * 100);
  console.log(`  ${cat}: ${score}/100`);
});

console.log('\n=== PWA-SPECIFIC AUDITS ===\n');

// Key PWA audits
const pwaAudits = [
  'viewport',
  'apple-touch-icon',
  'maskable-icon',
  'content-width',
  'themed-omnibox',
  'splash-screen'
];

pwaAudits.forEach(auditId => {
  const audit = report.audits[auditId];
  if (audit) {
    const status = audit.score === 1 ? '✓ PASS' : audit.score === null ? '⊘ N/A' : '✗ FAIL';
    console.log(`${status} - ${audit.title}`);
    if (audit.score !== 1 && audit.description) {
      console.log(`       ${audit.description}`);
    }
  }
});

// Check for manifest-related audits
console.log('\n=== MANIFEST AUDITS ===\n');
const manifestAudits = Object.keys(report.audits).filter(k =>
  k.includes('manifest') || k.includes('install')
);

manifestAudits.forEach(auditId => {
  const audit = report.audits[auditId];
  const status = audit.score === 1 ? '✓ PASS' : audit.score === null ? '⊘ N/A' : '✗ FAIL';
  console.log(`${status} - ${audit.title || auditId}`);
});

// Check for service worker audits
console.log('\n=== SERVICE WORKER AUDITS ===\n');
const swAudits = Object.keys(report.audits).filter(k =>
  k.includes('service') || k.includes('offline')
);

swAudits.forEach(auditId => {
  const audit = report.audits[auditId];
  const status = audit.score === 1 ? '✓ PASS' : audit.score === null ? '⊘ N/A' : '✗ FAIL';
  console.log(`${status} - ${audit.title || auditId}`);
});

// Calculate PWA readiness score (manual calculation)
console.log('\n=== PWA READINESS SUMMARY ===\n');
const criticalPWAAudits = [
  'viewport',
  'apple-touch-icon',
  'themed-omnibox'
];

let passed = 0;
let total = 0;
criticalPWAAudits.forEach(auditId => {
  const audit = report.audits[auditId];
  if (audit && audit.score !== null) {
    total++;
    if (audit.score === 1) passed++;
  }
});

const pwaScore = total > 0 ? Math.round((passed / total) * 100) : 0;
console.log(`PWA Score (estimated): ${pwaScore}/100`);
console.log(`Critical audits passed: ${passed}/${total}`);
console.log(pwaScore >= 90 ? '\n✓ PWA SCORE >= 90 - PASSED!' : '\n✗ PWA score < 90 - needs improvement');
