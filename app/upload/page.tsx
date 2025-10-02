"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { TextPreviewDialog } from "@/components/text-preview-dialog";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DragDropUpload } from "@/components/drag-drop-upload";

function UploadPageContent() {
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ term, definition, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }
      setDefinition("");
      setSource("");
      setTerm(""); // Clear the term field as well
      setUploadedFile(null);
      setUploadedFileName("");
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
        body: JSON.stringify({ term, definition, source, status: "draft" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Save draft failed");
      }
      setDefinition("");
      setSource("");
      setTerm(""); // Clear the term field as well
      setUploadedFile(null);
      setUploadedFileName("");
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

      // Store extracted text and metadata for preview dialog
      setExtractedText(data.extractedText || "");
      setExtractionMethod(data.method || "pdf-text");
      setExtractionConfidence(data.confidence);
      setUploadedFileName(fileToUpload.name);
      setUploadedFile(fileToUpload);

      console.log("UploadPage: Setting showTextPreview to true");
      // Show preview dialog instead of directly submitting
      setShowTextPreview(true);
      setSuccess(
        `File processed successfully! Please review and edit the extracted text, then fill in the term name and source (required), and click Submit to save your contribution.`
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

  function handleRemoveFile() {
    setUploadedFile(null);
    setUploadedFileName("");
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
            <DragDropUpload
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
                <label htmlFor="definition" className="text-sm font-medium">
                  Definition *
                </label>
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
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Where did this definition come from?"
                  className="w-full"
                />
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
      <UploadPageContent />
    </ProtectedRoute>
  );
}
