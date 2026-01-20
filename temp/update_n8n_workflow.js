// Script to update n8n workflow via API
// This will be run manually if needed, but let's try the MCP tool first

const fs = require('fs');
const path = require('path');

const workflowFile = path.join(__dirname, '../n8n-workflows/TDF-Regrid-Scraper_DGXfvxQpgn25n3OO_FIXED_2026-01-12.json');
const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

console.log('Workflow to update:');
console.log('- Name:', workflow.name);
console.log('- Nodes:', workflow.nodes.length);
console.log('- Connections:', Object.keys(workflow.connections).length);
console.log('\nFirst node:', workflow.nodes[0].name);

// Export for use in other scripts
module.exports = { workflow };
