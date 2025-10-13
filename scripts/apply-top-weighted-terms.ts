/*
  Apply the top weighted terms function to Supabase.
  Uses direct SQL execution via service role.
*/

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
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  // Read the SQL file
  const sqlFilePath = path.join(
    process.cwd(),
    "supabase",
    "top-weighted-terms-function.sql"
  );
  const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");

  console.log("Applying top weighted terms function to Supabase...\n");

  // Execute SQL using Supabase REST API
  const response = await fetch(`${url}/rest/v1/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ query: sqlContent }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to execute SQL: ${response.status} ${response.statusText}\n\n` +
        `Please run this SQL manually in the Supabase SQL Editor:\n` +
        `1. Go to: https://supabase.com/dashboard/project/_/sql/new\n` +
        `2. Copy the contents from: ${sqlFilePath}\n` +
        `3. Click "Run"\n\n` +
        `SQL to run:\n${sqlContent}`
    );
  }

  console.log("✓ Function created successfully!\n");
}

main().catch((err) => {
  console.error("\n" + err.message);
  process.exit(1);
});
