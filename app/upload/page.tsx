"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SimpleFileUpload } from "@/components/simple-file-upload";
import Link from "next/link";
import { SourceAutocompleteInput } from "@/components/source-autocomplete-input";
import Image from "next/image";

type SourcePreview = {
  sourceKey: string;
  kind: "db" | "openlibrary";
  title: string;
  author: string | null;
  year: string | null;
  publisher: string | null;
  isbn: string | null;
  coverUrl: string | null;
  openLibraryKey: string | null;
  id: string | null;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function UploadPageContent() {
  const params = useSearchParams();
  const [term, setTerm] = useState(params?.get("term") ?? "");
  const [definition, setDefinition] = useState("");
  const [source, setSource] = useState(params?.get("source") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractionMethod, setExtractionMethod] = useState<"pdf-text" | "ocr">(
    "pdf-text"
  );
  const [extractionConfidence, setExtractionConfidence] = useState<
    number | undefined
  >();
  // const [uploadedFileName, setUploadedFileName] = useState(""); // Unused - removed to fix build warning
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [isSourcePreviewLoading, setIsSourcePreviewLoading] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(
    null
  );
  const [isSourceEnriching, setIsSourceEnriching] = useState(false);

  const sourceKey = useMemo(() => normalizeKey(source), [source]);

  useEffect(() => {
    if (!sourceKey || sourceKey.length < 2) {
      setSourcePreview(null);
      setSourcePreviewError(null);
      setIsSourcePreviewLoading(false);
      return;
    }

    let aborted = false;
    const controller = new AbortController();

    setIsSourcePreviewLoading(true);
    setSourcePreviewError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/sources?title=${encodeURIComponent(source.trim())}`,
          { cache: "no-store", signal: controller.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (aborted) return;

        const db = data?.source ?? null;
        if (db && typeof db.title === "string" && db.title.trim()) {
          const next: SourcePreview = {
            sourceKey: normalizeKey(db.title),
            kind: "db",
            id: typeof db.id === "string" ? db.id : null,
            title: db.title,
            author: db.author ?? null,
            year: db.year ?? null,
            publisher: db.publisher ?? null,
            isbn: db.isbn ?? null,
            coverUrl: db.cover_url ?? null,
            openLibraryKey: db.openlibrary_key ?? null,
          };
          setSourcePreview(next);
        } else {
          setSourcePreview((prev) => {
            if (!prev) return null;
            if (prev.kind === "db") return null;
            return prev.sourceKey === sourceKey ? prev : null;
          });
        }
      } catch (err) {
        if (!aborted) {
          setSourcePreview(null);
          setSourcePreviewError((err as Error).message);
        }
      } finally {
        if (!aborted) setIsSourcePreviewLoading(false);
      }
    }, 250);

    return () => {
      aborted = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sourceKey, source]);

  const activeSourcePreview =
    sourcePreview && sourcePreview.sourceKey === sourceKey ? sourcePreview : null;

  async function handleSourceEnrich() {
    if (isSourceEnriching) return;
    const title = source.trim();
    if (!title) return;

    setIsSourceEnriching(true);
    setSourcePreviewError(null);
    try {
      const res = await fetch("/api/sources/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to enrich source.");
      }
      const enriched = data?.enriched ?? {};
      const nextTitle =
        typeof enriched.title === "string" && enriched.title.trim()
          ? enriched.title.trim()
          : title;

      setSource(nextTitle);
      setSourcePreview({
        sourceKey: normalizeKey(nextTitle),
        kind: "openlibrary",
        id: null,
        title: nextTitle,
        author:
          typeof enriched.author === "string" ? enriched.author.trim() : null,
        year: typeof enriched.year === "string" ? enriched.year.trim() : null,
        publisher:
          typeof enriched.publisher === "string"
            ? enriched.publisher.trim()
            : null,
        isbn: typeof enriched.isbn === "string" ? enriched.isbn.trim() : null,
        coverUrl:
          typeof enriched.coverUrl === "string" ? enriched.coverUrl.trim() : null,
        openLibraryKey:
          typeof enriched.openLibraryKey === "string"
            ? enriched.openLibraryKey.trim()
            : null,
      });
    } catch (err) {
      setSourcePreviewError((err as Error).message);
    } finally {
      setIsSourceEnriching(false);
    }
  }

  function validateSubmission() {
    const issues = [];

    if (!term.trim()) {
      issues.push("Term name is required");
    }

    if (definition.trim().length < 10) {
      issues.push("Definition must be at least 10 characters long");
    }

    if (!source.trim()) {
      issues.push("Source is required");
    }

    return issues;
  }

  function showValidationPopup(issues: string[]) {
    setValidationMessage(issues.join(". ") + ".");
    setShowValidationWarning(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationIssues = validateSubmission();
    if (validationIssues.length > 0) {
      showValidationPopup(validationIssues);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim(), definition, source: source.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }
      setDefinition("");
      setSource("");
      setTerm(""); // Clear the term field as well
      setUploadedFile(null);
      // setUploadedFileName(""); // Unused
      setExtractedText("");
      setSuccess(
        `Term "${data.term}" uploaded successfully! You can now add another term.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSaveDraft() {
    const validationIssues = validateSubmission();
    if (validationIssues.length > 0) {
      showValidationPopup(validationIssues);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: term.trim(),
          definition,
          source: source.trim(),
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Save draft failed");
      }
      setDefinition("");
      setSource("");
      setTerm(""); // Clear the term field as well
      setUploadedFile(null);
      // setUploadedFileName(""); // Unused
      setExtractedText("");
      setSuccess(
        `Draft "${data.term}" saved successfully! You can now add another term.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFileUpload(file?: File) {
    console.log("UploadPage: handleFileUpload called with file:", file?.name);
    const fileToUpload = file || fileInputRef.current?.files?.[0];
    if (!fileToUpload) {
      console.log("UploadPage: no file to upload");
      return;
    }

    // Remove term requirement for file upload - users can upload first, then fill term

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      console.log("UploadPage: creating FormData and making API call");
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("term", term.trim() || "Untitled");
      formData.append("source", source.trim() || "File upload");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("UploadPage: API response status:", res.status);

      const data = await res.json();
      console.log("UploadPage: API response data:", data);
      if (!res.ok) {
        throw new Error(data?.error ?? "File upload failed");
      }

      // Store extracted text and metadata, and set definition directly
      const extractedContent = data.extractedText || "";
      setExtractedText(extractedContent);
      setDefinition(extractedContent); // Set directly in textarea
      setExtractionMethod(data.method || "pdf-text");
      setExtractionConfidence(data.confidence);
      // setUploadedFileName(fileToUpload.name); // Unused
      setUploadedFile(fileToUpload);

      console.log("UploadPage: Text extracted and set in definition field");
      // Show success message
      setSuccess(
        `File processed successfully using ${
          data.method === "ocr" ? "OCR" : "text extraction"
        }${
          data.confidence
            ? ` (confidence: ${Math.round(data.confidence)}%)`
            : ""
        }! Review the extracted text below, fill in the term name and source, then click Submit.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveFile() {
    setUploadedFile(null);
    // setUploadedFileName(""); // Unused
    setExtractedText("");
    setDefinition("");
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Add New Term</h1>
        <p className="text-muted-foreground">
          Upload a PDF or image to extract text, or manually enter your term
          definition
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Upload Area */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Upload Document</h2>
            <SimpleFileUpload
              onFileSelect={handleFileUpload}
              disabled={isSubmitting || isUploading}
              acceptedTypes={[
                ".pdf",
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".bmp",
                ".tiff",
              ]}
              maxSizeInMB={10}
              isUploading={isUploading}
              uploadedFile={uploadedFile}
              onRemoveFile={handleRemoveFile}
            />
          </div>

          {/* Hidden file input for fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
            onChange={() => handleFileUpload()}
            className="hidden"
          />

          {uploadedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">
                    File Ready for Processing
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your file has been uploaded and processed successfully.
                    Review the extracted text below, fill in the term name and
                    source, then click Submit to save your contribution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Form */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Term Details</h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="term" className="text-sm font-medium">
                  Term *
                </label>
                <Input
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Enter the term name (can be filled after uploading a file)"
                  aria-invalid={!term}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="definition" className="text-sm font-medium">
                    Definition *
                  </label>
                  {uploadedFile && extractedText && (
                    <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded">
                      {extractionMethod === "ocr" ? "📷 OCR" : "📄 Text"}{" "}
                      extracted
                      {extractionConfidence &&
                        ` • ${Math.round(extractionConfidence)}% confidence`}
                    </span>
                  )}
                </div>
                <textarea
                  id="definition"
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  placeholder="Enter the definition or upload a file to extract text automatically"
                  className="w-full min-h-32 rounded-md border px-3 py-2 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="source" className="text-sm font-medium">
                  Source *
                </label>
                <SourceAutocompleteInput
                  id="source"
                  value={source}
                  onValueChange={(next) => {
                    setSource(next);
                    const nextKey = normalizeKey(next);
                    setSourcePreview((prev) => {
                      if (!prev) return null;
                      if (prev.kind === "openlibrary" && prev.sourceKey !== nextKey) {
                        return null;
                      }
                      return prev;
                    });
                    setSourcePreviewError(null);
                  }}
                  placeholder="Where did this definition come from?"
                  disabled={isSubmitting || isUploading}
                  className="w-full"
                />
                {source.trim() && (
                  <p className="text-xs text-muted-foreground">
                    <Link
                      href={`/sources/${encodeURIComponent(source.trim())}`}
                      className="underline"
                    >
                      Open source page (add/edit metadata)
                    </Link>
                  </p>
                )}
                {source.trim() &&
                  (!activeSourcePreview || activeSourcePreview.kind !== "db") && (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {activeSourcePreview?.kind === "openlibrary"
                          ? "Preview from Open Library (not saved yet)."
                          : "No saved metadata yet."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSourceEnrich}
                        disabled={isSubmitting || isUploading || isSourceEnriching}
                      >
                        {isSourceEnriching
                          ? "Searching..."
                          : activeSourcePreview?.kind === "openlibrary"
                          ? "Search again"
                          : "Search Open Library"}
                      </Button>
                    </div>
                  )}
                {(isSourcePreviewLoading || sourcePreviewError) && (
                  <div className="text-xs text-muted-foreground">
                    {isSourcePreviewLoading ? "Loading source metadata..." : ""}
                    {sourcePreviewError ? (
                      <span className="text-red-600">{sourcePreviewError}</span>
                    ) : null}
                  </div>
                )}
                {activeSourcePreview && (
                  <div className="rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-20 w-14 overflow-hidden rounded border bg-muted">
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
                          {activeSourcePreview.title.trim().slice(0, 1).toUpperCase()}
                        </div>
                        {activeSourcePreview.coverUrl && (
                          <Image
                            src={activeSourcePreview.coverUrl}
                            alt="Cover"
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium break-words">
                            {activeSourcePreview.title}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {activeSourcePreview.kind === "db"
                              ? "Saved metadata"
                              : "Open Library"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[
                            activeSourcePreview.author,
                            activeSourcePreview.year,
                            activeSourcePreview.publisher,
                            activeSourcePreview.isbn
                              ? `ISBN ${activeSourcePreview.isbn}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No metadata details."}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Link
                            href={
                              activeSourcePreview.id
                                ? `/sources/new?id=${encodeURIComponent(
                                    activeSourcePreview.id
                                  )}`
                                : `/sources/new?title=${encodeURIComponent(
                                    activeSourcePreview.title
                                  )}`
                            }
                            className="underline"
                          >
                            {activeSourcePreview.id ? "Edit metadata" : "Add metadata"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {uploadedFile && (
                  <p className="text-xs text-muted-foreground">
                    Source is required before submitting
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-red-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-green-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting…" : "Submit Term"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting || isUploading}
                  onClick={onSaveDraft}
                >
                  {isSubmitting ? "Saving…" : "Save Draft"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Validation Warning Dialog */}
      {showValidationWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Missing Required Information
              </h3>
            </div>
            <p className="text-gray-700 mb-6">{validationMessage}</p>
            <div className="flex justify-end">
              <Button
                onClick={() => setShowValidationWarning(false)}
                className="px-6"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Upload</h1>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        }
      >
        <UploadPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
