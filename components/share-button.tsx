"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toast, useToast } from "@/components/ui/toast";

interface ShareButtonProps {
  term: string;
  candidates: Array<{
    id: string;
    text: string;
    source: string;
    weight: number;
  }>;
  slug: string;
}

export function ShareButton({ term, candidates, slug }: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDefinitionSelector, setShowDefinitionSelector] = useState(false);
  const [selectedDefinitionIds, setSelectedDefinitionIds] = useState<string[]>(
    []
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTerm, setPreviewTerm] = useState<string>("");
  const { toast, showToast, hideToast } = useToast();

  const closePreview = useCallback(() => {
    setShowPreview(false);
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
      setPreviewImage(null);
    }
  }, [previewImage]);

  // Handle escape key to close preview or selector
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (showPreview) {
          closePreview();
        } else if (showDefinitionSelector) {
          closeDefinitionSelector();
        }
      }
    }

    if (showPreview || showDefinitionSelector) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [showPreview, showDefinitionSelector, closePreview]);

  function openDefinitionSelector() {
    setShowDefinitionSelector(true);
    // Pre-select the highest weighted definition
    const bestCandidate = candidates.reduce((best, current) =>
      current.weight > best.weight ? current : best
    );
    setSelectedDefinitionIds([bestCandidate.id]);
  }

  function closeDefinitionSelector() {
    setShowDefinitionSelector(false);
    setSelectedDefinitionIds([]);
  }

  function toggleDefinitionSelection(id: string) {
    setSelectedDefinitionIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  }

  function selectAllDefinitions() {
    setSelectedDefinitionIds(candidates.map((c) => c.id));
  }

  function clearAllDefinitions() {
    setSelectedDefinitionIds([]);
  }

  async function generateShareCard() {
    if (selectedDefinitionIds.length === 0) {
      return;
    }

    setIsGenerating(true);
    setShowDefinitionSelector(false);
    try {
      const selectedDefinitions = candidates.filter((c) =>
        selectedDefinitionIds.includes(c.id)
      );

      // Create canvas with real content
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // First pass: Calculate actual content height
      const definitionWidth = 680;
      const lineHeight = 22;
      let contentHeight = 140; // Starting Y position after title

      // Measure each definition's height
      selectedDefinitions.forEach((definition, index) => {
        // Definition number
        if (selectedDefinitions.length > 1) {
          contentHeight += 25;
        }

        // Count lines for definition text
        ctx.font = "16px Arial";
        const words = definition.text.split(" ");
        let line = "";
        let lineCount = 0;
        const maxLines = 3;

        for (let i = 0; i < words.length && lineCount < maxLines; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);

          if (metrics.width > definitionWidth && i > 0) {
            line = words[i] + " ";
            lineCount++;
          } else {
            line = testLine;
          }
        }
        // Add last line
        contentHeight += (lineCount + 1) * lineHeight + 5;

        // Source and badge height
        contentHeight += 20;

        // Space before next definition
        if (index < selectedDefinitions.length - 1) {
          contentHeight += 30;
        }
      });

      // Add footer spacing
      const footerSpacing = 50;
      const calculatedHeight = contentHeight + footerSpacing + 30;

      // Spotify-style dimensions
      canvas.width = 800;
      canvas.height = calculatedHeight;

      // Dark background
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 0, 800, calculatedHeight);

      // Ambiguity logo
      ctx.fillStyle = "#1db854";
      ctx.font = "bold 20px Arial";
      ctx.fillText("Ambiguity", 70, 60);

      // Term title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Arial";
      ctx.fillText(term, 70, 100);

      // Render each selected definition
      let currentY = 140;

      selectedDefinitions.forEach((definition, index) => {
        // Definition number (if multiple)
        if (selectedDefinitions.length > 1) {
          ctx.fillStyle = "#1db854";
          ctx.font = "bold 36px Arial";
          ctx.fillText(`#${index + 1}`, 70, currentY);
          currentY += 25;
        }

        // Definition text
        ctx.fillStyle = "#b3b3b3";
        ctx.font = "20px Arial";

        // Simple text wrapping
        const words = definition.text.split(" ");
        let line = "";
        const maxLines = 3;
        let lineCount = 0;

        for (let i = 0; i < words.length && lineCount < maxLines; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);

          if (metrics.width > definitionWidth && i > 0) {
            ctx.fillText(line, 70, currentY);
            line = words[i] + " ";
            currentY += lineHeight;
            lineCount++;
          } else {
            line = testLine;
          }
        }

        // Add ellipsis if text was truncated
        if (lineCount >= maxLines && line.length < definition.text.length) {
          ctx.fillText(line.trim() + "...", 70, currentY);
        } else {
          ctx.fillText(line, 70, currentY);
        }
        currentY += lineHeight + 5;

        // Source and confidence
        ctx.fillStyle = "#535353";
        ctx.font = "20px Arial";
        ctx.fillText(definition.source, 70, currentY);

        // Confidence badge
        const confidencePercent = Math.round(definition.weight * 100);
        const confidenceText = `${confidencePercent}%`;
        const badgeWidth = ctx.measureText(confidenceText).width + 16;
        const badgeHeight = 20;
        const badgeX = 70 + ctx.measureText(definition.source).width + 15;
        const badgeY = currentY - 18;

        // Badge background
        ctx.fillStyle = "#1db854";
        ctx.fillRect(badgeX, badgeY + 2, badgeWidth, badgeHeight);

        // Badge text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Arial";
        ctx.fillText(confidenceText, badgeX + 12, badgeY + 16);

        currentY += 20;

        // Space before next definition
        if (index < selectedDefinitions.length - 1) {
          currentY += 30;
        }
      });

      // Footer positioned after content with proper spacing
      const footerY = currentY + footerSpacing;
      ctx.fillStyle = "#535353";
      ctx.font = "16px Arial";
      ctx.fillText(
        `${selectedDefinitions.length} of ${candidates.length} definitions`,
        70,
        footerY
      );

      ctx.fillStyle = "#1db854";
      ctx.font = "bold 16px Arial";
      ctx.fillText("Explore on Ambiguity", 580, footerY);

      // Convert to blob and show in popup
      canvas.toBlob(
        (blob) => {
          if (blob) {
            showImagePreview(blob, term);
          }
        },
        "image/png",
        0.9
      );
    } catch (error) {
      console.error("Error generating share card:", error);
      alert("Failed to generate share card. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function showImagePreview(blob: Blob, termName: string) {
    const url = URL.createObjectURL(blob);
    setPreviewImage(url);
    setPreviewTerm(termName);
    setShowPreview(true);
  }

  function downloadImage() {
    if (previewImage) {
      const link = document.createElement("a");
      link.href = previewImage;
      link.download = `${previewTerm.replace(/\s+/g, "-")}-share-card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Share card downloaded successfully!");
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/term/${slug}`;
    navigator.clipboard.writeText(url);
    showToast("Link copied to clipboard!");
  }

  function shareToTwitter() {
    const url = encodeURIComponent(`${window.location.origin}/term/${slug}`);
    const text = encodeURIComponent(
      `Check out the definition of "${term}" on Ambiguity`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank"
    );
  }

  function shareToLinkedIn() {
    const url = encodeURIComponent(`${window.location.origin}/term/${slug}`);
    const title = encodeURIComponent(`Definition: ${term}`);
    const summary = encodeURIComponent(
      `Explore the definition of "${term}" and its various interpretations on Ambiguity`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`,
      "_blank"
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={openDefinitionSelector}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Generate Card (JPEG)
              </div>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyLink}>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Link
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToTwitter}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              Share on Twitter
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToLinkedIn}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Share on LinkedIn
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Image Preview Dialog */}
      {showPreview && previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Share Card Preview</h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Image Preview */}
            <div className="p-4 flex justify-center bg-gray-50 max-h-[60vh] overflow-auto">
              <img
                src={previewImage}
                alt={`${previewTerm} share card`}
                className="max-w-full h-auto object-contain rounded-lg shadow-sm"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Preview of your share card for &ldquo;{previewTerm}&rdquo;
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closePreview}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={downloadImage}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Definition Selector Dialog */}
      {showDefinitionSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeDefinitionSelector}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Select Definition
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Choose which definition to feature on the share card
                </p>
              </div>
              <button
                onClick={closeDefinitionSelector}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Selection Controls */}
            <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllDefinitions}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearAllDefinitions}
                  className="text-xs font-medium text-gray-600 hover:text-gray-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {selectedDefinitionIds.length} selected
              </span>
            </div>

            {/* Definitions List */}
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
              {candidates
                .sort((a, b) => b.weight - a.weight)
                .map((candidate) => {
                  const isSelected = selectedDefinitionIds.includes(
                    candidate.id
                  );
                  return (
                    <button
                      key={candidate.id}
                      onClick={() => toggleDefinitionSelection(candidate.id)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-all group ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 group-hover:border-blue-400"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm leading-relaxed mb-2 ${
                              isSelected ? "text-gray-900" : "text-gray-800"
                            }`}
                          >
                            {candidate.text}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-500">
                              {candidate.source}
                            </span>
                            <div className="flex items-center gap-1">
                              <div className="w-full bg-gray-200 rounded-full h-1.5 w-16">
                                <div
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{
                                    width: `${candidate.weight * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600">
                                {Math.round(candidate.weight * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                {candidates.length} definition
                {candidates.length !== 1 ? "s" : ""} available
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeDefinitionSelector}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateShareCard}
                  disabled={selectedDefinitionIds.length === 0 || isGenerating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Generate Card
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
