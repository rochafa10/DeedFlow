const report = require('./lighthouse-pwa.json');

console.log('=== LIGHTHOUSE PWA AUDIT RESULTS ===\n');

// PWA Category Score
if (report.categories.pwa) {
  const pwaScore = Math.round(report.categories.pwa.score * 100);
  console.log(`PWA CATEGORY SCORE: ${pwaScore}/100`);
  console.log(pwaScore >= 90 ? '✓ PASSED (>= 90)' : '✗ FAILED (< 90)');
  console.log('');
}

// Individual PWA audits
console.log('=== INDIVIDUAL PWA AUDITS ===\n');

const pwaAudits = [
  'service-worker',
  'viewport',
  'installable-manifest',
  'splash-screen',
  'themed-omnibox',
  'maskable-icon',
  'content-width',
  'pwa-cross-browser',
  'pwa-page-transitions',
  'pwa-each-page-has-url'
];

pwaAudits.forEach(auditId => {
  const audit = report.audits[auditId];
  if (audit) {
    const status = audit.score === 1 ? '✓' : audit.score === null ? '⊘' : '✗';
    const scoreStr = audit.score !== null ? `${Math.round(audit.score * 100)}/100` : 'N/A';
    console.log(`${status} ${audit.title} - ${scoreStr}`);

    if (audit.score !== 1 && audit.description) {
      console.log(`  → ${audit.description}`);
    }
    if (audit.score !== 1 && audit.explanation) {
      console.log(`  → ${audit.explanation}`);
    }
  }
});

// Summary
console.log('\n=== SUMMARY ===\n');
const passed = pwaAudits.filter(id => report.audits[id]?.score === 1).length;
const total = pwaAudits.filter(id => report.audits[id] && report.audits[id].score !== null).length;
console.log(`Audits passed: ${passed}/${total}`);

if (report.categories.pwa) {
  const pwaScore = Math.round(report.categories.pwa.score * 100);
  console.log(`\nFinal PWA Score: ${pwaScore}/100`);
  console.log(`Status: ${pwaScore >= 90 ? '✓ PASSED' : '✗ FAILED'}`);
}
