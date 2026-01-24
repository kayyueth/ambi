"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function NewSourceContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initialTitle = params?.get("title") ?? "";
  const initialId = params?.get("id") ?? "";

  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [openLibraryKey, setOpenLibraryKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sourceId, setSourceId] = useState(initialId);
  const [error, setError] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setSourceId(initialId);
  }, [initialId]);

  useEffect(() => {
    if (!sourceId) {
      setIsEditing(false);
      return;
    }
    let aborted = false;

    async function loadSource() {
      setIsEditing(true);
      setError(null);
      try {
        const res = await fetch(`/api/sources?id=${sourceId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to load source metadata.");
        }
        const data = await res.json();
        if (aborted) return;
        if (!data.source) {
          throw new Error("Source not found.");
        }
        setTitle(data.source.title ?? "");
        setAuthor(data.source.author ?? "");
        setYear(data.source.year ?? "");
        setPublisher(data.source.publisher ?? "");
        setIsbn(data.source.isbn ?? "");
        setCoverUrl(data.source.cover_url ?? null);
        setOpenLibraryKey(data.source.openlibrary_key ?? null);
      } catch (err) {
        if (!aborted) {
          setError((err as Error).message);
        }
      }
    }

    loadSource();
    return () => {
      aborted = true;
    };
  }, [sourceId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        isEditing && sourceId ? `/api/sources/${sourceId}` : "/api/sources",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing
              ? { author, year, publisher, isbn, coverUrl, openLibraryKey }
              : {
                  title: trimmedTitle,
                  author,
                  year,
                  publisher,
                  isbn,
                  coverUrl,
                  openLibraryKey,
                }
          ),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save source.");
      }

      router.push(`/sources/${encodeURIComponent(trimmedTitle)}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEnrich() {
    if (isEnriching) return;

    setIsEnriching(true);
    setEnrichError(null);
    try {
      const res = await fetch("/api/sources/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, isbn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to enrich source.");
      }

      const enriched = data?.enriched ?? {};

      function fill(
        currentValue: string,
        nextValue: unknown,
        setter: (v: string) => void
      ) {
        const next = typeof nextValue === "string" ? nextValue.trim() : "";
        if (!next) return;
        if (overwriteExisting || !currentValue.trim()) setter(next);
      }

      if (!isEditing) {
        fill(title, enriched.title, setTitle);
      }
      fill(author, enriched.author, setAuthor);
      fill(year, enriched.year, setYear);
      fill(publisher, enriched.publisher, setPublisher);
      fill(isbn, enriched.isbn, setIsbn);

      const nextCoverUrl =
        typeof enriched.coverUrl === "string" ? enriched.coverUrl.trim() : "";
      if (nextCoverUrl && (overwriteExisting || !coverUrl)) {
        setCoverUrl(nextCoverUrl);
      }

      const nextKey =
        typeof enriched.openLibraryKey === "string"
          ? enriched.openLibraryKey.trim()
          : "";
      if (nextKey && (overwriteExisting || !openLibraryKey)) {
        setOpenLibraryKey(nextKey);
      }
    } catch (err) {
      setEnrichError((err as Error).message);
    } finally {
      setIsEnriching(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Source" : "New Source"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update metadata for this source."
              : "Add book metadata so others can file definitions under the same source."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <input
                  id="overwriteExisting"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  disabled={isSubmitting || isEnriching}
                />
                <label
                  htmlFor="overwriteExisting"
                  className="text-muted-foreground"
                >
                  Overwrite existing fields
                </label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnrich}
                disabled={isSubmitting || isEnriching}
              >
                {isEnriching ? "Fetching..." : "Auto-fill (Open Library)"}
              </Button>
            </div>

            {enrichError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {enrichError}
              </div>
            )}

            {coverUrl && (
              <div className="rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="h-24 w-16 rounded object-cover border"
                    onError={() => setCoverUrl(null)}
                  />
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">Cover</div>
                    <div className="text-muted-foreground">
                      From Open Library.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Outline of a Theory of Practice"
                disabled={isEditing}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="author" className="text-sm font-medium">
                  Author
                </label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Pierre Bourdieu"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="year" className="text-sm font-medium">
                  Year
                </label>
                <Input
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 1977"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="publisher" className="text-sm font-medium">
                  Publisher
                </label>
                <Input
                  id="publisher"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. Cambridge University Press"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="isbn" className="text-sm font-medium">
                  ISBN
                </label>
              <Input
                id="isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 9780521291644"
              />
            </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Save Source"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewSourcePage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">New Source</h1>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        }
      >
        <NewSourceContent />
      </Suspense>
    </ProtectedRoute>
  );
}
