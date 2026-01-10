import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      titles?: string[];
    };
    const titles = Array.isArray(body.titles)
      ? body.titles.map((t) => (typeof t === "string" ? t.trim() : ""))
      : [];
    const uniqueTitles = Array.from(new Set(titles.filter(Boolean)));

    if (uniqueTitles.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select(
        "id, title, author, year, publisher, isbn, created_by, created_at, updated_at"
      )
      .in("title", uniqueTitles);

    if (error) {
      console.error("Supabase sources lookup error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sources" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sources: data ?? [] });
  } catch (error) {
    console.error("Sources lookup error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
