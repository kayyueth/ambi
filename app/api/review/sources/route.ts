import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    // Fetch all unique sources from published definitions
    const { data: definitions, error } = await supabase
      .from("definitions")
      .select("source")
      .eq("status", "published");

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sources" },
        { status: 500 }
      );
    }

    // Extract unique sources
    const uniqueSources = Array.from(
      new Set(definitions?.map((def) => def.source).filter(Boolean) || [])
    ).sort();

    return NextResponse.json({ sources: uniqueSources });
  } catch (error) {
    console.error("Sources API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
