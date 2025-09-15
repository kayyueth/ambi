"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TextPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (editedText: string) => void;
  extractedText: string;
  method: "pdf-text" | "ocr";
  confidence?: number;
  fileName: string;
}

export function TextPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  extractedText,
  method,
  confidence,
  fileName,
}: TextPreviewDialogProps) {
  const [editedText, setEditedText] = useState(extractedText);

  // Update edited text when extracted text changes
  useEffect(() => {
    setEditedText(extractedText);
  }, [extractedText]);

  const handleConfirm = () => {
    onConfirm(editedText);
    onClose();
  };

  const handleCancel = () => {
    setEditedText(extractedText); // Reset to original
    onClose();
  };

  const getMethodDisplayName = (method: string) => {
    return method === "pdf-text" ? "PDF Text Extraction" : "OCR Recognition";
  };

  const getConfidenceDisplay = () => {
    if (method === "ocr" && confidence !== undefined) {
      return ` (${Math.round(confidence)}% confidence)`;
    }
    return "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Extracted Text</DialogTitle>
          <DialogDescription>
            Review and edit the text extracted from <strong>{fileName}</strong>{" "}
            using <strong>{getMethodDisplayName(method)}</strong>
            {getConfidenceDisplay()}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <div className="space-y-2">
            <label htmlFor="text-editor" className="text-sm font-medium">
              Extracted Text ({editedText.length} characters)
            </label>
            <Textarea
              id="text-editor"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="No text extracted..."
              className="min-h-[300px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={editedText.trim().length < 10}
          >
            Use This Text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
