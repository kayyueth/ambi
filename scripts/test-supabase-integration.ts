#!/usr/bin/env tsx

/**
 * Test script to verify Supabase integration
 * Run with: npx tsx scripts/test-supabase-integration.ts
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ ${name} is not set`);
    process.exit(1);
  }
  return value;
}

async function testSupabaseIntegration() {
  console.log("🧪 Testing Supabase Integration...\n");

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test 1: Check if tables exist
    console.log("1️⃣ Testing table existence...");
    const { error: termsError } = await supabase
      .from("terms")
      .select("count")
      .limit(1);

    const { error: defError } = await supabase
      .from("definitions")
      .select("count")
      .limit(1);

    if (termsError || defError) {
      console.error("❌ Tables not found. Run the schema migration first.");
      console.error("Terms error:", termsError?.message);
      console.error("Definitions error:", defError?.message);
      return;
    }
    console.log("✅ Tables exist\n");

    // Test 2: Test insert operation
    console.log("2️⃣ Testing insert operations...");
    const testTerm = {
      slug: "test-term-" + Date.now(),
      term: "Test Term",
    };

    const { data: newTerm, error: insertTermError } = await supabase
      .from("terms")
      .insert(testTerm)
      .select("id")
      .single();

    if (insertTermError) {
      console.error("❌ Failed to insert term:", insertTermError.message);
      return;
    }
    console.log("✅ Term inserted successfully");

    const testDefinition = {
      term_id: newTerm.id,
      text: "This is a test definition",
      source: "Test Source",
      weight: 0.5,
      status: "pending" as const,
      user_id: null,
    };

    const { data: newDef, error: insertDefError } = await supabase
      .from("definitions")
      .insert(testDefinition)
      .select("id")
      .single();

    if (insertDefError) {
      console.error("❌ Failed to insert definition:", insertDefError.message);
      return;
    }
    console.log("✅ Definition inserted successfully\n");

    // Test 3: Test read operations
    console.log("3️⃣ Testing read operations...");
    const { data: fetchedTerm, error: fetchError } = await supabase
      .from("terms")
      .select(
        `
        id,
        term,
        slug,
        definitions (
          id,
          text,
          source,
          status
        )
      `
      )
      .eq("id", newTerm.id)
      .single();

    if (fetchError || !fetchedTerm) {
      console.error("❌ Failed to fetch term:", fetchError?.message);
      return;
    }

    console.log("✅ Term fetched successfully");
    console.log(`   Term: ${fetchedTerm.term}`);
    console.log(`   Definitions: ${fetchedTerm.definitions?.length || 0}\n`);

    // Test 4: Test search functionality
    console.log("4️⃣ Testing search functionality...");
    const { data: searchResults, error: searchError } = await supabase
      .from("terms")
      .select("term, slug")
      .textSearch("term", "Test", {
        type: "websearch",
        config: "english",
      })
      .limit(5);

    if (searchError) {
      console.error("❌ Search failed:", searchError.message);
      return;
    }

    console.log("✅ Search working");
    console.log(`   Found ${searchResults?.length || 0} results\n`);

    // Test 5: Test update operation
    console.log("5️⃣ Testing update operations...");
    const { error: updateError } = await supabase
      .from("definitions")
      .update({ status: "published" })
      .eq("id", newDef.id);

    if (updateError) {
      console.error("❌ Update failed:", updateError.message);
      return;
    }
    console.log("✅ Definition status updated successfully\n");

    // Test 6: Clean up test data
    console.log("6️⃣ Cleaning up test data...");
    const { error: deleteDefError } = await supabase
      .from("definitions")
      .delete()
      .eq("id", newDef.id);

    const { error: deleteTermError } = await supabase
      .from("terms")
      .delete()
      .eq("id", newTerm.id);

    if (deleteDefError || deleteTermError) {
      console.error("❌ Cleanup failed");
      console.error("Definition error:", deleteDefError?.message);
      console.error("Term error:", deleteTermError?.message);
    } else {
      console.log("✅ Test data cleaned up\n");
    }

    console.log(
      "🎉 All tests passed! Supabase integration is working correctly."
    );
    console.log("\n📋 Next steps:");
    console.log(
      "1. Run the data migration script: npx tsx scripts/migrate-to-supabase.ts"
    );
    console.log("2. Test your application endpoints");
    console.log("3. Set up authentication if needed");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  }
}

// Run tests
testSupabaseIntegration();
