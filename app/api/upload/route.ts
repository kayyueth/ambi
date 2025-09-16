import { NextRequest, NextResponse } from "next/server";
import { toSlug } from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  processUploadedFile,
  type FileProcessingResult,
} from "@/lib/file-processing";

type UploadBody = {
  term: string;
  definition: string;
  source?: string;
  userId?: string;
};

type FileUploadBody = {
  term: string;
  source?: string;
  userId?: string;
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
    const userId = (formData.get("userId") as string) || "anonymous";

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

    // Persist to Supabase
    const slug = toSlug(term.trim());
    const supabase = getSupabaseServerClient();

    const { data: termRow } = await upsertTerm(supabase, {
      slug,
      term: term.trim(),
    });

    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth.user?.id ?? null;

    const { data: defRow, error: insertErr } = await supabase
      .from("definitions")
      .insert({
        term_id: termRow!.id,
        text: result.text,
        source: `${source} (${result.method})`,
        weight: result.confidence ? result.confidence / 100 : 0.5,
        status: "pending",
        user_id: currentUserId,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug, id: defRow!.id });
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
  const userId = body.userId || "anonymous";

  console.log("/api/upload text upload", {
    term,
    defLen: definition.length,
    source,
    userId,
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
  const supabase = getSupabaseServerClient();

  const { data: termRow } = await upsertTerm(supabase, { slug, term });

  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id ?? null;

  const { data: defRow, error: insertErr } = await supabase
    .from("definitions")
    .insert({
      term_id: termRow!.id,
      text: definition,
      source,
      weight: 0.5,
      status: "pending",
      user_id: currentUserId,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug, id: defRow!.id });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Supa = ReturnType<typeof getSupabaseServerClient>;

async function upsertTerm(
  supabase: Supa,
  payload: { slug: string; term: string }
) {
  // Try existing
  const { data: existing } = await supabase
    .from("terms")
    .select("id")
    .eq("slug", payload.slug)
    .maybeSingle();

  if (existing) {
    return { data: { id: existing.id } } as const;
  }

  const { data, error } = await supabase
    .from("terms")
    .insert({ slug: payload.slug, term: payload.term })
    .select("id")
    .single();

  if (error) throw error;
  return { data } as const;
}
