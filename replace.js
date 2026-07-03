const fs = require('fs');
let code = fs.readFileSync('lib/commerce-orders.ts', 'utf8');
code = code.replace(/supabase(\s*)\.from\("commerce_orders"\)/g, '(supabase as any)$1.from("commerce_orders")');
fs.writeFileSync('lib/commerce-orders.ts', code);
