import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function normalizeOptional(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = (await req.json().catch(() => ({}))) as {
      author?: string;
      year?: string;
      publisher?: string;
      isbn?: string;
      coverUrl?: string;
      openLibraryKey?: string;
    };

    const supabase = await getSupabaseServerClient();
    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatePayload = {
      author: normalizeOptional(payload.author),
      year: normalizeOptional(payload.year),
      publisher: normalizeOptional(payload.publisher),
      isbn: normalizeOptional(payload.isbn),
      cover_url: normalizeOptional(payload.coverUrl),
      openlibrary_key: normalizeOptional(payload.openLibraryKey),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("sources")
      .update(updatePayload)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase source update error:", error);
      return NextResponse.json(
        { error: "Failed to update source" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sources PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
