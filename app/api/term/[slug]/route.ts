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

    // Lookup usernames for author ids
    const authorIds = Array.from(
      new Set(publishedDefinitions.map((d: any) => d.user_id).filter(Boolean))
    );
    let idToUsername: Record<string, string | null> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", authorIds as string[]);
      if (profiles) {
        idToUsername = profiles.reduce(
          (acc: Record<string, string | null>, p: any) => {
            acc[p.id] = p.username ?? null;
            return acc;
          },
          {}
        );
      }
    }

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
        username: def.user_id ? idToUsername[def.user_id] ?? null : null,
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
