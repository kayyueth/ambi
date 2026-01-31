"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SourceAutocompleteInput } from "@/components/source-autocomplete-input";

interface ContributionItem {
  id: string;
  text: string;
  source: string;
  term?: string | null;
  status: "draft" | "pending" | "published" | "rejected";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [isSourcePreviewLoading, setIsSourcePreviewLoading] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(
    null
  );
  const [isSourceEnriching, setIsSourceEnriching] = useState(false);

  const sourceKey = useMemo(() => normalizeKey(source), [source]);

  // Update form when contribution changes
  useEffect(() => {
    if (contribution) {
      setText(contribution.text || "");
      setSource(contribution.source || "");
      setTerm(contribution.term || "");
      setError(null);
    }
  }, [contribution]);

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
          setSourcePreview({
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
          });
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

  function handleClose() {
    if (!isSaving && !isSubmitting) {
      setText("");
      setSource("");
      setTerm("");
      setSourcePreview(null);
      setSourcePreviewError(null);
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
    if (!source.trim()) {
      validationIssues.push("Source is required");
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

  async function handleSubmitForReview() {
    if (!contribution) return;

    const validationIssues = [];
    if (!text.trim()) {
      validationIssues.push("Definition is required");
    }
    if (text.trim().length < 10) {
      validationIssues.push("Definition must be at least 10 characters long");
    }
    if (!source.trim()) {
      validationIssues.push("Source is required");
    }
    if (!term.trim()) {
      validationIssues.push("Term is required to submit for review");
    }

    if (validationIssues.length > 0) {
      setError(validationIssues.join(". ") + ".");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update the status to pending first
      const statusRes = await fetch(`/api/contributions/${contribution.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });

      const statusResult = await statusRes.json();
      if (!statusRes.ok) {
        throw new Error(statusResult?.error ?? "Failed to submit for review");
      }

      // Then save the changes (which will reload the data with the updated status)
      await onSave(contribution.id, {
        text: text.trim(),
        source: source.trim(),
        term: term.trim(),
      });

      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
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
              disabled={isSaving || isSubmitting}
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
                    disabled={isSaving || isSubmitting || isSourceEnriching}
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
            disabled={isSaving || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              isSubmitting ||
              !text.trim() ||
              text.trim().length < 10 ||
              !source.trim()
            }
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          {contribution?.status === "draft" && (
            <Button
              type="button"
              onClick={handleSubmitForReview}
              disabled={
                isSaving ||
                isSubmitting ||
                !text.trim() ||
                text.trim().length < 10 ||
                !source.trim() ||
                !term.trim()
              }
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
