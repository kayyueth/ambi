import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const definitionId = searchParams.get("definitionId");

  if (!definitionId) {
    return NextResponse.json(
      { error: "definitionId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("comments")
      .select("id, body, user_id, created_at, updated_at")
      .eq("definition_id", definitionId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data ?? [] });
  } catch (err) {
    console.error("Comments GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const definitionId: string | undefined = body?.definitionId;
    const text: string | undefined = (body?.body ?? "").trim();

    if (!definitionId) {
      return NextResponse.json(
        { error: "definitionId is required" },
        { status: 400 }
      );
    }
    if (!text || text.length === 0) {
      return NextResponse.json(
        { error: "Comment body is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();
    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({ definition_id: definitionId, body: text, user_id: user.id })
      .select("id, body, user_id, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err) {
    console.error("Comments POST error:", err);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
