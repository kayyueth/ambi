import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { text, source, term } = body;

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: "Text is required and must be at least 10 characters long" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // First, check if the contribution exists and get the user_id
    const { data: existingContribution, error: fetchError } = await supabase
      .from("definitions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingContribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    // Get the current user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if the user owns this contribution
    if (existingContribution.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own contributions" },
        { status: 403 }
      );
    }

    // Update the contribution
    const { error } = await supabase
      .from("definitions")
      .update({
        text: text.trim(),
        source: source?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update contribution" },
        { status: 500 }
      );
    }

    // If a new term is provided, update the term as well
    if (term && term.trim()) {
      const { data: definitionData } = await supabase
        .from("definitions")
        .select("term_id")
        .eq("id", id)
        .single();

      if (definitionData?.term_id) {
        await supabase
          .from("terms")
          .update({
            term: term.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", definitionData.term_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Contribution updated successfully",
    });
  } catch (error) {
    console.error("Error updating contribution:", error);
    return NextResponse.json(
      { error: "Failed to update contribution" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (
      !status ||
      !["draft", "pending", "published", "rejected"].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid status is required (draft, pending, published, rejected)",
        },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { error } = await supabase
      .from("definitions")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Contribution not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contribution status updated successfully",
    });
  } catch (error) {
    console.error("Error updating contribution:", error);
    return NextResponse.json(
      { error: "Failed to update contribution" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const supabase = await getSupabaseServerClient();

    // First, check if the contribution exists and get the user_id
    const { data: existingContribution, error: fetchError } = await supabase
      .from("definitions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingContribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    // Get the current user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if the user owns this contribution
    if (existingContribution.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own contributions" },
        { status: 403 }
      );
    }

    // Delete the contribution
    const { error } = await supabase.from("definitions").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete contribution" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contribution deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contribution:", error);
    return NextResponse.json(
      { error: "Failed to delete contribution" },
      { status: 500 }
    );
  }
}

interface ContributionWithTerms {
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const supabase = await getSupabaseServerClient();

    const { data: contribution, error } = (await supabase
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
      .eq("id", id)
      .single()) as {
      data: ContributionWithTerms | null;
      error: PostgrestError | null;
    };

    if (error || !contribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        term: {
          term: contribution?.terms?.term || null,
          slug: contribution?.terms?.slug || null,
        },
        candidate: {
          id: contribution?.id || "",
          text: contribution?.text || "",
          source: contribution?.source || "",
          weight: contribution?.weight || null,
          userId: contribution?.user_id || "",
          status: contribution?.status || "",
          createdAt: contribution?.created_at || "",
          updatedAt: contribution?.updated_at || "",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching contribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch contribution" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
