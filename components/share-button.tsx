"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toast, useToast } from "@/components/ui/toast";
import html2canvas from "html2canvas";

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTerm, setPreviewTerm] = useState<string>("");
  const { toast, showToast, hideToast } = useToast();

  // Handle escape key to close preview
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape" && showPreview) {
        closePreview();
      }
    }

    if (showPreview) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [showPreview]);

  async function generateShareCard() {
    setIsGenerating(true);
    try {
      // Get the best definition (highest weight)
      const bestDefinition = candidates.reduce((best, current) =>
        current.weight > best.weight ? current : best
      );

      // Create canvas with real content
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Spotify-style dimensions
      canvas.width = 800;
      canvas.height = 400;

      // Dark background
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 0, 800, 400);

      // Card background
      ctx.fillStyle = "#181818";
      ctx.fillRect(40, 30, 720, 340);

      // AMBI logo
      ctx.fillStyle = "#1db854";
      ctx.font = "bold 20px Arial";
      ctx.fillText("AMBI", 70, 60);

      // Term title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Arial";
      ctx.fillText(term, 70, 100);

      // Definition
      ctx.fillStyle = "#b3b3b3";
      ctx.font = "18px Arial";
      const definitionY = 140;
      const definitionWidth = 680;

      // Simple text wrapping
      const words = bestDefinition.text.split(" ");
      let line = "";
      let currentY = definitionY;
      const lineHeight = 24;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);

        if (metrics.width > definitionWidth && i > 0) {
          ctx.fillText(line, 70, currentY);
          line = words[i] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 70, currentY);

      // Source and confidence
      const sourceY = currentY + 40;
      ctx.fillStyle = "#535353";
      ctx.font = "14px Arial";
      ctx.fillText(bestDefinition.source, 70, sourceY);

      // Confidence badge
      const confidencePercent = Math.round(bestDefinition.weight * 100);
      const confidenceText = `${confidencePercent}% confidence`;
      const badgeWidth = ctx.measureText(confidenceText).width + 20;
      const badgeHeight = 24;
      const badgeX = 70 + ctx.measureText(bestDefinition.source).width + 20;
      const badgeY = sourceY - 20;

      // Badge background
      ctx.fillStyle = "#1db854";
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

      // Badge text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.fillText(confidenceText, badgeX + 10, badgeY + 16);

      // Footer
      const footerY = 350;
      ctx.fillStyle = "#535353";
      ctx.font = "12px Arial";
      ctx.fillText(`${candidates.length} definitions available`, 70, footerY);

      ctx.fillStyle = "#1db854";
      ctx.font = "bold 12px Arial";
      ctx.fillText("Explore on Ambi", 70 + 600, footerY);

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

  function createCanvasCard(
    term: string,
    bestDefinition: { text: string; source: string; weight: number },
    totalCandidates: number
  ): HTMLCanvasElement {
    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Add roundRect polyfill if not available
    if (!ctx.roundRect) {
      ctx.roundRect = function (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius,
          y + height
        );
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
      };
    }

    // Set canvas size - Spotify-style dimensions
    const width = 800;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Simplified canvas setup - no DPI scaling for now
    canvas.width = width;
    canvas.height = height;

    // Debug: Log canvas dimensions
    console.log("Canvas dimensions:", canvas.width, canvas.height);
    console.log("Scaled dimensions:", width, height);

    // Helper function to wrap text
    function wrapText(
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number
    ): number {
      ctx.textBaseline = "top";
      const words = text.split(" ");
      let line = "";
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      return currentY + lineHeight;
    }

    // Spotify-style dark background
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, width, height);

    // Debug: Draw a test rectangle to verify canvas is working
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(10, 10, 50, 20);
    console.log("Canvas context working, drawing test rectangle");

    // Debug: Draw simple test text
    ctx.fillStyle = "#ffff00";
    ctx.font = "30px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("TEST TEXT", 100, 50);
    console.log("Drawing test text at 100, 50");

    // Add subtle gradient overlay
    const overlayGradient = ctx.createLinearGradient(0, 0, width, height);
    overlayGradient.addColorStop(0, "rgba(29, 185, 84, 0.1)");
    overlayGradient.addColorStop(0.5, "rgba(30, 215, 96, 0.05)");
    overlayGradient.addColorStop(1, "rgba(25, 20, 20, 0.8)");
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, width, height);

    // Main content area (Spotify card style)
    const cardWidth = width - 80;
    const cardHeight = height - 60;
    const cardX = 40;
    const cardY = 30;

    // Draw main card background with subtle border
    ctx.fillStyle = "#181818";
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 12);
    ctx.fill();

    // Add subtle inner shadow effect
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#1f1f1f";
    ctx.roundRect(cardX + 2, cardY + 2, cardWidth - 4, cardHeight - 4, 10);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Content padding
    const padding = 30;
    const contentX = cardX + padding;
    const contentY = cardY + padding;

    // Draw Spotify-style header with logo area - BRIGHT YELLOW for debugging
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    console.log("Drawing AMBI at:", contentX, contentY + 20);
    ctx.fillText("AMBI", contentX, contentY + 20);

    // Draw term title (Spotify track style) - BRIGHT WHITE
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    console.log("Drawing term:", term, "at:", contentX, contentY + 60);
    ctx.fillText(term, contentX, contentY + 60);

    // Draw definition (Spotify artist style) - BRIGHT CYAN for debugging
    ctx.fillStyle = "#00ffff";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const definitionY = contentY + 100;
    console.log("Drawing definition at:", contentX, definitionY);

    // Wrap definition text
    const definitionWidth = cardWidth - padding * 2;
    wrapText(bestDefinition.text, contentX, definitionY, definitionWidth, 26);

    // Draw source and confidence (Spotify album style) - BRIGHT MAGENTA for debugging
    const sourceY = definitionY + 80;
    ctx.fillStyle = "#ff00ff";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    console.log(
      "Drawing source:",
      bestDefinition.source,
      "at:",
      contentX,
      sourceY
    );
    ctx.fillText(bestDefinition.source, contentX, sourceY);

    // Draw confidence as a Spotify-style popularity indicator
    const confidencePercent = Math.round(bestDefinition.weight * 100);
    const confidenceText = `${confidencePercent}% match`;
    const badgeWidth = ctx.measureText(confidenceText).width + 16;
    const badgeHeight = 20;
    const badgeX = contentX + ctx.measureText(bestDefinition.source).width + 20;
    const badgeY = sourceY - 16;

    // Spotify green badge
    ctx.fillStyle = "#1db854";
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(confidenceText, badgeX + 8, badgeY + 2);

    // Draw footer with candidates info (Spotify-style metadata)
    const footerY = cardY + cardHeight - 50;
    ctx.fillStyle = "#535353";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${totalCandidates} definitions available`, contentX, footerY);

    // Draw "Explore on Ambi" (Spotify-style link)
    ctx.fillStyle = "#1db854";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("Explore on Ambi", cardX + cardWidth - padding, footerY);

    // Add Spotify-style decorative elements
    // Draw subtle accent line
    ctx.fillStyle = "#1db854";
    ctx.fillRect(cardX, cardY + cardHeight - 2, cardWidth, 2);

    // Add some subtle dots/pattern (Spotify-style)
    ctx.fillStyle = "rgba(29, 185, 84, 0.3)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cardX + cardWidth - 60 + i * 8, cardY + 20, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
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

  function closePreview() {
    setShowPreview(false);
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
      setPreviewImage(null);
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
      `Check out the definition of "${term}" on Ambi`
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
      `Explore the definition of "${term}" and its various interpretations on Ambi`
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
          <DropdownMenuItem onClick={generateShareCard} disabled={isGenerating}>
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
            <div className="p-4 flex justify-center bg-gray-50">
              <img
                src={previewImage}
                alt={`${previewTerm} share card`}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Preview of your share card for "{previewTerm}"
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
    </>
  );
}
