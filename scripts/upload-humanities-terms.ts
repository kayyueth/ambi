/*
  Upload humanities core terms to Supabase.
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

interface HumanitiesData {
  terms: Array<{
    slug: string;
    term: string;
  }>;
  definitions: Array<{
    term_slug: string;
    text: string;
    source: string;
    weight: number;
    status: string;
  }>;
}

async function main() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Read the humanities terms JSON file
  const dataPath = process.argv[2];
  if (!dataPath) {
    throw new Error(
      "Please provide the path to the humanities_core_terms.json file"
    );
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const data: HumanitiesData = JSON.parse(fileContent);

  console.log(
    `Found ${data.terms.length} terms and ${data.definitions.length} definitions`
  );

  // Map to store slug -> term_id
  const slugToTermId = new Map<string, string>();

  // Insert all terms
  console.log("\nInserting terms...");
  for (const termData of data.terms) {
    const { data: existing, error: findErr } = await supabase
      .from("terms")
      .select("id")
      .eq("slug", termData.slug)
      .maybeSingle();

    if (findErr) throw findErr;

    let termId: string;
    if (existing?.id) {
      termId = existing.id;
      console.log(
        `  Term "${termData.term}" already exists (${termData.slug})`
      );
    } else {
      const { data: insertTerm, error: termErr } = await supabase
        .from("terms")
        .insert({ slug: termData.slug, term: termData.term })
        .select("id")
        .single();

      if (termErr) throw termErr;
      termId = insertTerm.id as string;
      console.log(`  ✓ Inserted term "${termData.term}" (${termData.slug})`);
    }

    slugToTermId.set(termData.slug, termId);
  }

  // Insert all definitions
  console.log("\nInserting definitions...");
  let insertedCount = 0;
  for (const defData of data.definitions) {
    const termId = slugToTermId.get(defData.term_slug);
    if (!termId) {
      console.warn(
        `  ⚠ Warning: No term found for slug "${defData.term_slug}", skipping definition`
      );
      continue;
    }

    const { error: defErr } = await supabase.from("definitions").insert({
      term_id: termId,
      text: defData.text,
      source: defData.source,
      weight: defData.weight,
      status: defData.status,
      user_id: null,
    });

    if (defErr) {
      console.error(
        `  ✗ Error inserting definition for "${defData.term_slug}":`,
        defErr
      );
      throw defErr;
    }

    insertedCount++;
    if (insertedCount % 10 === 0) {
      console.log(
        `  Progress: ${insertedCount}/${data.definitions.length} definitions inserted`
      );
    }
  }

  console.log(`\n✓ Upload complete!`);
  console.log(`  Terms: ${data.terms.length}`);
  console.log(`  Definitions: ${insertedCount}`);
}

main().catch((err) => {
  console.error("\n✗ Error:", err);
  process.exit(1);
});
