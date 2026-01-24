const report = require('./lighthouse-report.json');

console.log('All available audits:\n');
Object.keys(report.audits).sort().forEach(auditId => {
  const audit = report.audits[auditId];
  console.log(`${auditId}: ${audit.title}`);
});
