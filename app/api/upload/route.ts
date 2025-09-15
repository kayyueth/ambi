import { NextRequest, NextResponse } from "next/server";
import {
  TERMS,
  toSlug,
  type DefinitionCandidate,
  type TermEntry,
} from "@/lib/mock-data";
import {
  processUploadedFile,
  type FileProcessingResult,
} from "@/lib/file-processing";

type UploadBody = {
  term: string;
  definition: string;
  source?: string;
};

type FileUploadBody = {
  term: string;
  source?: string;
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle file uploads (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      return await handleFileUpload(req);
    }

    // Handle JSON text uploads
    const body = (await req.json()) as Partial<UploadBody>;
    return await handleTextUpload(body);
  } catch (err) {
    console.error("/api/upload error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

async function handleFileUpload(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const term = formData.get("term") as string;
    const source = (formData.get("source") as string) || "File upload";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!term || term.trim().length === 0) {
      return NextResponse.json({ error: "Term is required" }, { status: 400 });
    }

    console.log("/api/upload file upload", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      term: term.trim(),
      source,
    });

    // Process the uploaded file
    const result: FileProcessingResult = await processUploadedFile(file);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!result.text || result.text.length < 10) {
      return NextResponse.json(
        { error: "No readable text found in the uploaded file" },
        { status: 400 }
      );
    }

    // Create term entry with extracted text
    const slug = toSlug(term.trim());
    let entry: TermEntry | undefined = TERMS.find((t) => t.slug === slug);
    if (!entry) {
      entry = { term: term.trim(), slug, candidates: [] };
      TERMS.push(entry);
    }

    const candidate: DefinitionCandidate = {
      id: `${slug}-${Date.now()}`,
      text: result.text,
      source: `${source} (${result.method})`,
      weight: result.confidence ? result.confidence / 100 : 0.5,
    };
    entry.candidates.push(candidate);

    return NextResponse.json({
      ok: true,
      slug,
      id: candidate.id,
      extractedText: result.text,
      method: result.method,
      confidence: result.confidence,
    });
  } catch (err) {
    console.error("/api/upload file upload error", err);
    return NextResponse.json(
      { error: "File processing failed" },
      { status: 500 }
    );
  }
}

async function handleTextUpload(body: Partial<UploadBody>) {
  const term = (body.term ?? "").trim();
  const definition = (body.definition ?? "").trim();
  const source = (body.source ?? "User submission").trim();

  console.log("/api/upload text upload", {
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
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
