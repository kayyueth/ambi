import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Fetch all definitions for the user
    const { data: definitions, error } = await supabase
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
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch contributions" },
        { status: 500 }
      );
    }

    // Group by status
    const contributions = {
      draft: [] as any[],
      pending: [] as any[],
      published: [] as any[],
      rejected: [] as any[],
    };

    definitions?.forEach((def) => {
      const contribution = {
        id: def.id,
        text: def.text,
        source: def.source,
        weight: def.weight,
        userId: def.user_id,
        status: def.status,
        createdAt: def.created_at,
        updatedAt: def.updated_at,
        term: def.terms?.term,
        slug: def.terms?.slug,
      };

      const key = def.status as keyof typeof contributions;
      if (contributions[key]) {
        contributions[key].push(contribution);
      }
    });

    return NextResponse.json({
      success: true,
      data: contributions,
    });
  } catch (error) {
    console.error("Error fetching contributions:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
