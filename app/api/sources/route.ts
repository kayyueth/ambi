import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SourcePayload = {
  title: string;
  author?: string;
  year?: string;
  publisher?: string;
  isbn?: string;
  coverUrl?: string;
  openLibraryKey?: string;
};

function normalizeOptional(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const title = searchParams.get("title")?.trim();
  const q = searchParams.get("q")?.trim();
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 200)
    : 50;

  try {
    const supabase = await getSupabaseServerClient();

    if (id) {
      const { data, error } = await supabase
        .from("sources")
        .select(
          "id, title, author, year, publisher, isbn, cover_url, openlibrary_key, created_by, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase source lookup error:", error);
        return NextResponse.json(
          { error: "Failed to fetch source metadata" },
          { status: 500 }
        );
      }

      return NextResponse.json({ source: data ?? null });
    }

    if (title) {
      const { data, error } = await supabase
        .from("sources")
        .select(
          "id, title, author, year, publisher, isbn, cover_url, openlibrary_key, created_by, created_at, updated_at"
        )
        .eq("title", title)
        .maybeSingle();

      if (error) {
        console.error("Supabase source lookup error:", error);
        return NextResponse.json(
          { error: "Failed to fetch source metadata" },
          { status: 500 }
        );
      }

      return NextResponse.json({ source: data ?? null });
    }

    let query = supabase
      .from("sources")
      .select(
        "id, title, author, year, publisher, isbn, cover_url, openlibrary_key, created_by, created_at, updated_at"
      );

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase sources list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sources" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sources: data ?? [] });
  } catch (error) {
    console.error("Sources API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<SourcePayload>;
    const title = (body.title ?? "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();
    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("sources")
      .select(
        "id, title, author, year, publisher, isbn, cover_url, openlibrary_key, created_by, created_at, updated_at"
      )
      .eq("title", title)
      .maybeSingle();

    if (existingError) {
      console.error("Supabase source lookup error:", existingError);
      return NextResponse.json(
        { error: "Failed to create source" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ source: existing }, { status: 200 });
    }

    const payload = {
      title,
      author: normalizeOptional(body.author),
      year: normalizeOptional(body.year),
      publisher: normalizeOptional(body.publisher),
      isbn: normalizeOptional(body.isbn),
      cover_url: normalizeOptional(body.coverUrl),
      openlibrary_key: normalizeOptional(body.openLibraryKey),
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("sources")
      .insert(payload)
      .select(
        "id, title, author, year, publisher, isbn, cover_url, openlibrary_key, created_by, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("Supabase source create error:", error);
      // If another user created it concurrently, fetch and return it.
      const { data: concurrent } = await supabase
        .from("sources")
        .select(
          "id, title, author, year, publisher, isbn, cover_url, openlibrary_key, created_by, created_at, updated_at"
        )
        .eq("title", title)
        .maybeSingle();
      if (concurrent) {
        return NextResponse.json({ source: concurrent }, { status: 200 });
      }
      return NextResponse.json(
        { error: error.message || "Failed to create source" },
        { status: 500 }
      );
    }

    return NextResponse.json({ source: data }, { status: 201 });
  } catch (error) {
    console.error("Sources POST error:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
