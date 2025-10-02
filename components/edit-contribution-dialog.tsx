"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContributionItem {
  id: string;
  text: string;
  source: string;
  term?: string | null;
}

interface EditContributionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contribution: ContributionItem | null;
  onSave: (
    id: string,
    data: { text: string; source: string; term: string }
  ) => Promise<void>;
}

export function EditContributionDialog({
  isOpen,
  onClose,
  contribution,
  onSave,
}: EditContributionDialogProps) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [term, setTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when contribution changes
  useEffect(() => {
    if (contribution) {
      setText(contribution.text || "");
      setSource(contribution.source || "");
      setTerm(contribution.term || "");
      setError(null);
    }
  }, [contribution]);

  function handleClose() {
    if (!isSaving) {
      setText("");
      setSource("");
      setTerm("");
      setError(null);
      onClose();
    }
  }

  async function handleSave() {
    if (!contribution) return;

    const validationIssues = [];
    if (!text.trim()) {
      validationIssues.push("Definition is required");
    }
    if (text.trim().length < 10) {
      validationIssues.push("Definition must be at least 10 characters long");
    }

    if (validationIssues.length > 0) {
      setError(validationIssues.join(". ") + ".");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(contribution.id, {
        text: text.trim(),
        source: source.trim(),
        term: term.trim(),
      });
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Contribution</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="term" className="text-sm font-medium">
              Term
            </label>
            <Input
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter the term name"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="definition" className="text-sm font-medium">
              Definition *
            </label>
            <textarea
              id="definition"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the definition"
              className="w-full min-h-32 rounded-md border px-3 py-2 text-sm resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="source" className="text-sm font-medium">
              Source (optional)
            </label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Where did this definition come from?"
              disabled={isSaving}
            />
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
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !text.trim() || text.trim().length < 10}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
