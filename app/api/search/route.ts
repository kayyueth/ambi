import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  try {
    const supabase = await getSupabaseServerClient();

    if (!q || q === "%") {
      // For homepage: return top 15 terms by highest definition weight
      const { data: terms, error } = await supabase.rpc(
        "get_top_weighted_terms",
        { limit_count: 15 }
      );

      if (error) {
        console.error("Supabase RPC error:", error);
        // Fallback to simple query if RPC doesn't exist
        const { data: fallbackTerms, error: fallbackError } = await supabase
          .from("terms")
          .select("term, slug, definitions!inner(id)")
          .eq("definitions.status", "published")
          .limit(15);

        if (fallbackError) {
          console.error("Supabase fallback error:", fallbackError);
          return NextResponse.json({ error: "Search failed" }, { status: 500 });
        }

        return NextResponse.json({
          results: fallbackTerms || [],
        });
      }

      return NextResponse.json({
        results: terms || [],
      });
    } else {
      // Use PostgreSQL trigram search for fuzzy matching
      const { data: terms, error } = await supabase
        .from("terms")
        .select("term, slug, definitions!inner(id)")
        .eq("definitions.status", "published")
        .textSearch("term", q, {
          type: "websearch",
          config: "english",
        })
        .limit(20);

      if (error) {
        console.error("Supabase search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
      }

      return NextResponse.json({
        results: terms || [],
      });
    }
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
