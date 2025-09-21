import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  try {
    const supabase = await getSupabaseServerClient();

    // Fetch term and its published definitions
    const { data: termData, error: termError } = await supabase
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
          weight,
          status,
          user_id,
          created_at,
          updated_at
        )
      `
      )
      .eq("slug", slug)
      .single();

    if (termError || !termData) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Filter to only published definitions for public access
    const publishedDefinitions =
      termData.definitions?.filter((def: any) => def.status === "published") ||
      [];

    return NextResponse.json({
      term: termData.term,
      slug: termData.slug,
      candidates: publishedDefinitions.map((def: any) => ({
        id: def.id,
        text: def.text,
        source: def.source,
        weight: def.weight,
        status: def.status,
        userId: def.user_id,
        createdAt: def.created_at,
        updatedAt: def.updated_at,
      })),
    });
  } catch (error) {
    console.error("Term fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch term" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
