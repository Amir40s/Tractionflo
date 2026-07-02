const fs = require('fs');
const files = [
  'lib/revenue-intelligence.ts',
  'lib/revenue-learning.ts',
  'lib/revenue-provider-execution.ts',
  'lib/support-tickets.ts'
];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\.map\(\(row\)/g, '.map((row: any)');
  code = code.replace(/\.filter\(\(row\)/g, '.filter((row: any)');
  code = code.replace(/\.map\(row\s*=>/g, '.map((row: any) =>');
  code = code.replace(/\.filter\(row\s*=>/g, '.filter((row: any) =>');
  fs.writeFileSync(file, code);
}
