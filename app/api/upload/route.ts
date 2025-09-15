import { NextRequest, NextResponse } from "next/server";
import {
  TERMS,
  toSlug,
  type DefinitionCandidate,
  type TermEntry,
} from "@/lib/mock-data";

type UploadBody = {
  term: string;
  definition: string;
  source?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<UploadBody>;
    const term = (body.term ?? "").trim();
    const definition = (body.definition ?? "").trim();
    const source = (body.source ?? "User submission").trim();

    console.log("/api/upload POST", {
      term,
      defLen: definition.length,
      source,
    });

    if (!term) {
      return NextResponse.json({ error: "Term is required" }, { status: 400 });
    }
    if (!definition || definition.length < 10) {
      return NextResponse.json(
        { error: "Definition must be at least 10 characters" },
        { status: 400 }
      );
    }

    const slug = toSlug(term);
    let entry: TermEntry | undefined = TERMS.find((t) => t.slug === slug);
    if (!entry) {
      entry = { term, slug, candidates: [] };
      TERMS.push(entry);
    }

    const candidate: DefinitionCandidate = {
      id: `${slug}-${Date.now()}`,
      text: definition,
      source,
      weight: 0.5,
    };
    entry.candidates.push(candidate);

    return NextResponse.json({ ok: true, slug, id: candidate.id });
  } catch (err) {
    console.error("/api/upload error", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export const runtime = "nodejs";
