const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const connectionString = "postgresql://postgres:dHsAS2XuIsjOiL7M@db.lostrgojrmaskqcusfwb.supabase.co:5432/postgres";
  const client = new Client({ connectionString });
  await client.connect();
  
  const sqlPath = path.join(__dirname, '..', 'migrations', '20260706_instagram_content_publishing.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log("Applying migration...");
  await client.query(sql);
  console.log("Migration successful");
  
  await client.end();
}

main().catch(err => {
  console.error("Error running migration:", err);
  process.exit(1);
});
