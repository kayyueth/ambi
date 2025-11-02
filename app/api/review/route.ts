import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

interface DefinitionWithTerms {
  id: string;
  text: string;
  source: string;
  weight: number | null;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  terms: {
    term: string;
    slug: string;
  } | null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source")?.trim();

  try {
    const supabase = await getSupabaseServerClient();

    // Build the query based on whether source filter is provided
    let query = supabase
      .from("definitions")
      .select(
        `
        id,
        text,
        source,
        weight,
        status,
        user_id,
        created_at,
        updated_at,
        terms (
          term,
          slug
        )
      `
      )
      .eq("status", "published");

    // If source is provided, filter by source
    if (source) {
      query = query.ilike("source", `%${source}%`);
    }

    const { data: definitions, error } = (await query.limit(100)) as {
      data: DefinitionWithTerms[] | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch review cards" },
        { status: 500 }
      );
    }

    // Transform the data to match the review card format
    const cards = (definitions || []).map((def) => ({
      id: def.id,
      text: def.text,
      source: def.source,
      term: def.terms?.term || "",
      slug: def.terms?.slug || "",
      weight: def.weight,
      createdAt: def.created_at,
      updatedAt: def.updated_at,
    }));

    // Return a random card from the pool
    if (cards.length === 0) {
      return NextResponse.json({ card: null });
    }

    const randomIndex = Math.floor(Math.random() * cards.length);
    const randomCard = cards[randomIndex];

    return NextResponse.json({ card: randomCard });
  } catch (error) {
    console.error("Review API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch review card" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
