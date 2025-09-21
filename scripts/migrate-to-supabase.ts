#!/usr/bin/env tsx

/**
 * Migration script to populate Supabase with existing mock data
 * Run with: npx tsx scripts/migrate-to-supabase.ts
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { TERMS } from "../lib/mock-data.js";

loadEnvConfig(process.cwd());

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ ${name} is not set`);
    process.exit(1);
  }
  return value;
}

async function migrateToSupabase() {
  console.log("🚀 Starting migration to Supabase...");

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseServiceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required for migration");
    console.log("💡 Get it from your Supabase project settings > API");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("🧹 Clearing existing data...");
    await supabase
      .from("definitions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("terms")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("📝 Migrating terms and definitions...");

    for (const termEntry of TERMS) {
      console.log(`  📖 Processing term: "${termEntry.term}"`);

      // Insert term
      const { data: termData, error: termError } = await supabase
        .from("terms")
        .insert({
          slug: termEntry.slug,
          term: termEntry.term,
        })
        .select("id")
        .single();

      if (termError) {
        console.error(
          `❌ Failed to insert term "${termEntry.term}":`,
          termError
        );
        continue;
      }

      console.log(`    ✅ Term created with ID: ${termData.id}`);

      // Insert definitions for this term
      for (const candidate of termEntry.candidates) {
        // Handle user ID conversion - convert string IDs to null since they're not real UUIDs
        const userId =
          candidate.userId === "anonymous" ||
          candidate.userId?.startsWith("demo-user")
            ? null
            : candidate.userId;

        const { error: defError } = await supabase.from("definitions").insert({
          term_id: termData.id,
          text: candidate.text,
          source: candidate.source,
          weight: candidate.weight,
          status: candidate.status,
          user_id: userId,
        });

        if (defError) {
          console.error(
            `❌ Failed to insert definition for "${termEntry.term}":`,
            defError
          );
        } else {
          console.log(`    ✅ Definition added`);
        }
      }
    }

    console.log("🎉 Migration completed successfully!");
    console.log("📊 Summary:");
    console.log(`   - ${TERMS.length} terms migrated`);
    console.log(
      `   - ${TERMS.reduce(
        (sum, t) => sum + t.candidates.length,
        0
      )} definitions migrated`
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateToSupabase();
