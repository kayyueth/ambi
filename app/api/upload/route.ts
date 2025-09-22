import { NextRequest, NextResponse } from "next/server";
import { toSlug } from "@/lib/mock-data";
import {
  processUploadedFile,
  type FileProcessingResult,
} from "@/lib/file-processing";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type UploadBody = {
  term: string;
  definition: string;
  source?: string;
  userId?: string;
  status?: "draft" | "published";
};

type FileUploadBody = {
  term: string;
  source?: string;
  userId?: string;
};

// Supabase integration functions
async function saveToSupabase(
  term: string,
  definition: string,
  source: string,
  userId?: string,
  status: "draft" | "published" = "published"
): Promise<{ success: boolean; slug: string; id: string; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get the authenticated user from the session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        slug: toSlug(term),
        id: "",
        error: "Authentication required. Please sign in to upload definitions.",
      };
    }

    const slug = toSlug(term);

    // First, ensure the term exists
    let { data: termData, error: termError } = await supabase
      .from("terms")
      .select("id")
      .eq("slug", slug)
      .single();

    let termId: string;

    if (termError && termError.code === "PGRST116") {
      // Term doesn't exist, create it
      const { data: newTerm, error: createError } = await supabase
        .from("terms")
        .insert({
          slug,
          term,
        })
        .select("id")
        .single();

      if (createError) {
        return {
          success: false,
          slug,
          id: "",
          error: `Failed to create term: ${createError.message}`,
        };
      }

      termId = newTerm.id;
    } else if (termError) {
      return {
        success: false,
        slug,
        id: "",
        error: `Failed to check term: ${termError.message}`,
      };
    } else {
      termId = termData.id;
    }

    // Insert the definition
    const { data: definitionData, error: defError } = await supabase
      .from("definitions")
      .insert({
        term_id: termId,
        text: definition,
        source,
        weight: 0.5,
        user_id: user.id, // Use the authenticated user's ID
        status, // Allow draft or published
      })
      .select("id")
      .single();

    if (defError) {
      return {
        success: false,
        slug,
        id: "",
        error: `Failed to save definition: ${defError.message}`,
      };
    }

    return {
      success: true,
      slug,
      id: definitionData.id,
    };
  } catch (error) {
    return {
      success: false,
      slug: toSlug(term),
      id: "",
      error: `Database error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

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
    const result_data = await saveToSupabase(
      term.trim(),
      result.text,
      `${source} (${result.method})`
    );

    if (!result_data.success) {
      return NextResponse.json(
        { error: result_data.error || "Failed to save contribution" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      slug: result_data.slug,
      id: result_data.id,
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
  const userId = body.userId || "anonymous";
  const status: "draft" | "published" =
    body.status === "draft" ? "draft" : "published";

  console.log("/api/upload text upload", {
    term,
    defLen: definition.length,
    source,
    userId,
  });

  if (!term) {
    return NextResponse.json({ error: "Term is required" }, { status: 400 });
  }
  if (status !== "draft" && (!definition || definition.length < 10)) {
    return NextResponse.json(
      { error: "Definition must be at least 10 characters" },
      { status: 400 }
    );
  }

  // Persist to Supabase
  const result_data = await saveToSupabase(
    term,
    definition,
    source,
    undefined,
    status
  );

  if (!result_data.success) {
    return NextResponse.json(
      { error: result_data.error || "Failed to save contribution" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    slug: result_data.slug,
    id: result_data.id,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
