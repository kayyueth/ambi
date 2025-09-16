import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const supabase = getSupabaseServerClient();

  const { data: termRow, error: termError } = await supabase
    .from("terms")
    .select("id, term, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (termError) {
    return NextResponse.json({ error: termError.message }, { status: 500 });
  }
  if (!termRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: defs, error: defsError } = await supabase
    .from("definitions")
    .select("id, text, source, weight, status, user_id, created_at, updated_at")
    .eq("term_id", termRow.id)
    .order("weight", { ascending: false });

  if (defsError) {
    return NextResponse.json({ error: defsError.message }, { status: 500 });
  }

  return NextResponse.json({
    term: termRow.term,
    slug: termRow.slug,
    candidates: (defs ?? []).map((d) => ({
      id: d.id,
      text: d.text,
      source: d.source,
      weight: d.weight,
      userId: d.user_id ?? undefined,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })),
  });
}

export const runtime = "nodejs";
