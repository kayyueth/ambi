import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const supabase = await getSupabaseServerClient();

    // Use PostgreSQL trigram search for fuzzy matching
    const { data: terms, error } = await supabase
      .from("terms")
      .select("term, slug")
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
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
