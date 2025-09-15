import { NextRequest, NextResponse } from "next/server";
import { TERMS } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }
  const results = TERMS.filter((t) =>
    t.term.toLowerCase().includes(q.toLowerCase())
  ).map((t) => ({ term: t.term, slug: t.slug }));
  return NextResponse.json({ results, total: TERMS.length });
}

export const runtime = "nodejs";
