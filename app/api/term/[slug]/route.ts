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
    interface DefinitionItem {
      id: string;
      text: string;
      source: string;
      weight: number | null;
      status: string;
      user_id: string;
      created_at: string;
      updated_at: string;
    }
    
    const publishedDefinitions =
      (termData.definitions as DefinitionItem[] | undefined)?.filter((def) => def.status === "published") ||
      [];

    // Lookup usernames for author ids
    const authorIds = Array.from(
      new Set(publishedDefinitions.map((d) => d.user_id).filter(Boolean))
    );
    let idToUsername: Record<string, string | null> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", authorIds as string[]);
      if (profiles) {
        idToUsername = profiles.reduce(
          (acc: Record<string, string | null>, p: { id: string; username: string | null }) => {
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
      candidates: publishedDefinitions.map((def) => ({
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
