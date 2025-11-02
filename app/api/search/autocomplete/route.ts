import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type")?.trim() ?? "term"; // "term" or "source"

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    let supabase;
    try {
      supabase = await getSupabaseServerClient();
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      return NextResponse.json(
        { suggestions: [], error: "Service unavailable" },
        { status: 503 }
      );
    }

    if (type === "source") {
      // Get distinct source names that match the query
      const { data: definitions, error } = await supabase
        .from("definitions")
        .select("source")
        .eq("status", "published")
        .ilike("source", `%${q}%`)
        .limit(10);

      if (error) {
        console.error("Supabase source autocomplete error:", error);
        return NextResponse.json({ suggestions: [] });
      }

      // Get unique sources
      const uniqueSources = Array.from(
        new Set(definitions?.map((d) => d.source) || [])
      ).slice(0, 8);

      return NextResponse.json({
        suggestions: uniqueSources.map((source) => ({
          value: source,
          label: source,
        })),
      });
    } else {
      // Get term suggestions using ILIKE for partial matching (more reliable than textSearch)
      const { data: terms, error } = await supabase
        .from("terms")
        .select("term, slug")
        .ilike("term", `%${q}%`)
        .limit(8);

      if (error) {
        console.error("Supabase term autocomplete error:", error);
        return NextResponse.json({ suggestions: [] });
      }

      return NextResponse.json({
        suggestions:
          terms?.map((t) => ({
            value: t.term,
            label: t.term,
            slug: t.slug,
          })) || [],
      });
    }
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}

export const runtime = "nodejs";
