import { NextRequest, NextResponse } from "next/server";
import { TERMS, findBySlug } from "@/lib/mock-data";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const entry = findBySlug(slug);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Return a shallow copy to avoid accidental mutation
  return NextResponse.json({
    term: entry.term,
    slug: entry.slug,
    candidates: entry.candidates,
    totalTerms: TERMS.length,
  });
}

export const runtime = "nodejs";
