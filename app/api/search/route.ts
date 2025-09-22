import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  try {
    const supabase = await getSupabaseServerClient();

    // Only show terms that have at least one published definition
    let query = supabase
      .from("terms")
      .select("term, slug, definitions!inner(id)")
      .eq("definitions.status", "published");

    if (!q || q === "%") {
      // If no query or wildcard, return all terms with published definitions
      query = query.limit(20);
    } else {
      // Use PostgreSQL trigram search for fuzzy matching
      query = query
        .textSearch("term", q, {
          type: "websearch",
          config: "english",
        })
        .limit(20);
    }

    const { data: terms, error } = await query;

    if (error) {
      console.error("Supabase search error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    return NextResponse.json({
      results: terms || [],
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
