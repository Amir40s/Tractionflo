const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const root = path.resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return env;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      return env;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
    return env;
  }, {});
}

async function main() {
  const fileEnv = {
    ...parseEnvFile(path.join(root, ".env")),
    ...parseEnvFile(path.join(root, ".env.local")),
  };
  const databaseUrl = process.env.DATABASE_URL || fileEnv.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required in .env.local, .env, or the shell environment.");
    process.exit(1);
  }

  const sqlPath = path.join(root, "migrations", "20260619_commerce_orders.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const url = new URL(databaseUrl);
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const sslDisabled = url.searchParams.get("sslmode") === "disable";

  const client = new Client({
    connectionString: databaseUrl,
    ssl: isLocalhost || sslDisabled ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Commerce orders migration applied.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
