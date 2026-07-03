const fs = require('fs');
const files = [
  'lib/revenue-intelligence.ts',
  'lib/revenue-learning.ts',
  'lib/revenue-provider-execution.ts',
  'lib/support-tickets.ts'
];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/supabase(\s*)\.from\((['"].*?['"])\)/g, '(supabase as any)$1.from($2)');
  fs.writeFileSync(file, code);
}
