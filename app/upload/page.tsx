"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { TextPreviewDialog } from "@/components/text-preview-dialog";

export default function UploadPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get("term") ?? "");
  const [definition, setDefinition] = useState("");
  const [source, setSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [extractionMethod, setExtractionMethod] = useState<"pdf-text" | "ocr">(
    "pdf-text"
  );
  const [extractionConfidence, setExtractionConfidence] = useState<
    number | undefined
  >();
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, definition, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }
      setDefinition("");
      setSource("");
      router.push(`/term/${data.slug}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFileUpload() {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    if (!term.trim()) {
      setError("Please enter a term before uploading a file");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("term", term.trim());
      formData.append("source", source || "File upload");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "File upload failed");
      }

      // Store extracted text and metadata for preview dialog
      setExtractedText(data.extractedText || "");
      setExtractionMethod(data.method || "pdf-text");
      setExtractionConfidence(data.confidence);
      setUploadedFileName(file.name);

      // Show preview dialog instead of directly submitting
      setShowTextPreview(true);
      setSuccess(
        `File processed successfully! Please review and edit the extracted text, then click Submit.`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function handleTextPreviewConfirm(editedText: string) {
    setDefinition(editedText);
    setShowTextPreview(false);
    setSuccess(`Text updated! Ready to submit.`);
  }

  function handleTextPreviewClose() {
    setShowTextPreview(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload</h1>
      <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term"
          aria-invalid={!term}
        />
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="Definition"
          className="w-full min-h-40 rounded-md border px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">Min 10 characters.</p>
        <Input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source (optional)"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              isUploading ||
              !term ||
              definition.trim().length < 10
            }
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleFileSelect}
            disabled={isSubmitting || isUploading || !term}
          >
            {isUploading ? "Processing…" : "Upload PDF/Image"}
          </Button>
        </div>
      </form>

      {/* Text Preview Dialog */}
      <TextPreviewDialog
        isOpen={showTextPreview}
        onClose={handleTextPreviewClose}
        onConfirm={handleTextPreviewConfirm}
        extractedText={extractedText}
        method={extractionMethod}
        confidence={extractionConfidence}
        fileName={uploadedFileName}
      />
    </div>
  );
}
