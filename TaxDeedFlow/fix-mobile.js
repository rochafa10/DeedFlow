const fs = require('fs');
const path = './src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix header flex
content = content.replace(
  'mb-8 flex items-center justify-between',
  'mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
);

// Fix inner flex
content = content.replace(
  /<div className="flex items-center gap-4">\s*\n\s*\{\/\* Last updated indicator \*\/\}/,
  '<div className="flex flex-wrap items-center gap-2 sm:gap-4">\n            {/* Last updated indicator */}'
);

// Hide auto-refresh text on mobile
content = content.replace(
  '<span className="text-slate-400">• Auto-refreshes every 10s</span>',
  '<span className="text-slate-400 hidden sm:inline">• Auto-refreshes every 10s</span>'
);

fs.writeFileSync(path, content);
console.log('File updated successfully');
