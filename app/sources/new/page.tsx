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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sourceId, setSourceId] = useState(initialId);
  const [error, setError] = useState<string | null>(null);

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
              ? { author, year, publisher, isbn }
              : {
                  title: trimmedTitle,
                  author,
                  year,
                  publisher,
                  isbn,
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
