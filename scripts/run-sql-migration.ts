/*
  Run a SQL migration file against Supabase.
  Uses service role key; DO NOT run in the browser.
*/

import { createClient } from "@supabase/supabase-js";
import * as path from "node:path";
import * as fs from "node:fs";

// Load env from .env.local if present
try {
  const envLocal = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocal)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: envLocal });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config();
  }
} catch {
  // ignore
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main() {
  const sqlFilePath = process.argv[2];
  if (!sqlFilePath) {
    throw new Error("Please provide the path to the SQL file as an argument");
  }

  const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Running SQL migration: ${sqlFilePath}\n`);

  const { data, error } = await supabase.rpc("exec_sql", { sql: sqlContent });

  if (error) {
    // If exec_sql doesn't exist, try executing via REST API
    console.log("Trying alternative method...");

    const response = await fetch(`${url}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sqlContent }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to execute SQL: ${response.status} ${response.statusText}`
      );
    }

    console.log("✓ SQL migration executed successfully!");
    return;
  }

  console.log("✓ SQL migration executed successfully!");
  if (data) {
    console.log("Result:", data);
  }
}

main().catch((err) => {
  console.error("\n✗ Migration failed:", err);
  console.log("\n💡 Please run this SQL manually in your Supabase SQL Editor:");
  console.log("   Go to: https://app.supabase.com/project/_/sql");
  console.log(`   Run the contents of: ${process.argv[2]}\n`);
  process.exit(1);
});
