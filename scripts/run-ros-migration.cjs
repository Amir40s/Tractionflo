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

  const sqlPaths = [
    path.join(root, "migrations", "20260622_revenue_operating_system.sql"),
    path.join(root, "migrations", "20260622_ros_phase2.sql"),
    path.join(root, "migrations", "20260623_messages_schema_backfill.sql"),
    path.join(root, "migrations", "20260623_ros_enterprise_phase3.sql"),
  ];
  const url = new URL(databaseUrl);
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const sslDisabled = url.searchParams.get("sslmode") === "disable";

  const client = new Client({
    connectionString: databaseUrl,
    ssl: isLocalhost || sslDisabled ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    for (const sqlPath of sqlPaths) {
      const sql = fs.readFileSync(sqlPath, "utf8");
      await client.query(sql);
    }

    const expectedTables = [
      "ros_prospects",
      "ros_conversation_insights",
      "ros_revenue_decisions",
      "ros_revenue_outcomes",
      "ros_escalation_events",
      "ros_learning_events",
      "ros_business_profiles",
      "ros_conversion_events",
      "ros_learning_summaries",
      "messages",
      "ros_provider_connections",
      "ros_outcome_executions",
      "support_tickets",
      "creator_issues",
      "platform_analytics_events",
      "ros_strategy_adaptations",
    ];
    const { rows } = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])
       order by table_name`,
      [expectedTables]
    );

    console.log(`ROS migrations applied. Tables found: ${rows.map((row) => row.table_name).join(", ")}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
