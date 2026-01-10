import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

interface DefinitionWithTerms {
  id: string;
  text: string;
  source: string;
  weight: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  terms: {
    term: string;
    slug: string;
  } | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source")?.trim();

  if (!source) {
    return NextResponse.json(
      { error: "source is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = (await supabase
      .from("definitions")
      .select(
        `
        id,
        text,
        source,
        weight,
        status,
        created_at,
        updated_at,
        terms (
          term,
          slug
        )
      `
      )
      .eq("status", "published")
      .eq("source", source)
      .order("updated_at", { ascending: false })) as {
      data: DefinitionWithTerms[] | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error("Supabase source terms error:", error);
      return NextResponse.json(
        { error: "Failed to fetch source terms" },
        { status: 500 }
      );
    }

    const results = (data ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      source: item.source,
      weight: item.weight,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      term: item.terms?.term ?? "",
      slug: item.terms?.slug ?? "",
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Sources terms API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch source terms" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
