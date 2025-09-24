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

    const comments = data ?? [];
    const userIds = Array.from(
      new Set(comments.map((c: { user_id: string }) => c.user_id).filter(Boolean))
    );
    let idToUsername: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds as string[]);
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

    const enriched = comments.map((c: { user_id: string; [key: string]: unknown }) => ({
      ...c,
      username: c.user_id ? idToUsername[c.user_id] ?? null : null,
    }));

    return NextResponse.json({ comments: enriched });
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

    // fetch username for the author
    let username: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) username = profile.username ?? null;

    return NextResponse.json(
      { comment: { ...data, username } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Comments POST error:", err);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
