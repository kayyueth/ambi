"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SourceMetadata = {
  id: string;
  title: string;
  author: string | null;
  year: string | null;
  publisher: string | null;
  isbn: string | null;
  cover_url?: string | null;
  openlibrary_key?: string | null;
};

type ExistingSource = { value: string; label: string };

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function coverFallback(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return "S";
  return trimmed.slice(0, 1).toUpperCase();
}

export default function SourcesIndexPage() {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<SourceMetadata[]>([]);
  const [existingSources, setExistingSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const shouldSearch = trimmedQuery.length >= 2;
        const metaUrl = shouldSearch
          ? `/api/sources?q=${encodeURIComponent(trimmedQuery)}&limit=60`
          : `/api/sources?limit=60`;

        const requests: Array<Promise<Response>> = [
          fetch(metaUrl, { cache: "no-store", signal: controller.signal }),
        ];

        if (shouldSearch) {
          requests.push(
            fetch(
              `/api/search/autocomplete?type=source&q=${encodeURIComponent(
                trimmedQuery
              )}`,
              { cache: "no-store", signal: controller.signal }
            )
          );
        }

        const [metaRes, existingRes] = await Promise.all(requests);
        if (aborted) return;

        const metaJson = metaRes.ok ? await metaRes.json() : { sources: [] };
        const nextSources: SourceMetadata[] = Array.isArray(metaJson.sources)
          ? metaJson.sources
          : [];
        setSources(nextSources);

        if (!shouldSearch || !existingRes) {
          setExistingSources([]);
          return;
        }

        const existingJson = existingRes.ok
          ? await existingRes.json()
          : { suggestions: [] };
        const suggestions: ExistingSource[] = Array.isArray(existingJson.suggestions)
          ? existingJson.suggestions
          : [];

        const withMetadata = new Set(
          nextSources.map((s) => normalizeKey(s.title))
        );
        const uniques = new Map<string, string>();
        for (const s of suggestions) {
          const value = typeof s.value === "string" ? s.value.trim() : "";
          if (!value) continue;
          const key = normalizeKey(value);
          if (!key || withMetadata.has(key)) continue;
          if (!uniques.has(key)) uniques.set(key, value);
        }
        setExistingSources(Array.from(uniques.values()).slice(0, 8));
      } catch (err) {
        if (aborted) return;
        setSources([]);
        setExistingSources([]);
        setError((err as Error).message);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }

    const timeoutId = setTimeout(load, 250);
    return () => {
      aborted = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmedQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Browse public source metadata. You can also add metadata for existing
            sources from uploaded definitions.
          </p>
        </div>
        <Link href="/sources/new">
          <Button size="sm">New source</Button>
        </Link>
      </div>

      <div className="max-w-xl space-y-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sources by title…"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && sources.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          No sources found.
        </div>
      )}

      {!isLoading && sources.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sources.map((source) => {
            const encodedTitle = encodeURIComponent(source.title);
            const metaLine = [source.author, source.year, source.publisher]
              .filter(Boolean)
              .join(" · ");
            return (
              <Card key={source.id} className="overflow-hidden">
                <Link href={`/sources/${encodedTitle}`} className="block">
                  <div className="relative aspect-[2/3] w-full bg-muted">
                    <div className="absolute inset-0 flex h-full w-full items-center justify-center text-4xl font-semibold text-muted-foreground">
                      {coverFallback(source.title)}
                    </div>
                    {source.cover_url && (
                      <Image
                        src={source.cover_url}
                        alt="Cover"
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                </Link>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/sources/${encodedTitle}`}
                      className="font-medium hover:underline break-words"
                    >
                      {source.title}
                    </Link>
                    <Badge variant="secondary" className="shrink-0">
                      Meta
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metaLine || "No metadata details yet."}
                  </p>
                  <Link
                    href={`/sources/new?id=${encodeURIComponent(source.id)}`}
                    className="text-xs text-muted-foreground underline"
                  >
                    Edit metadata
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && trimmedQuery.length >= 2 && existingSources.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">Existing sources (no metadata yet)</h2>
          <div className="grid gap-2">
            {existingSources.map((title) => {
              const encodedTitle = encodeURIComponent(title);
              return (
                <div
                  key={title}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Link
                    href={`/sources/${encodedTitle}`}
                    className="hover:underline"
                  >
                    {title}
                  </Link>
                  <Link
                    href={`/sources/new?title=${encodedTitle}`}
                    className="text-xs text-muted-foreground underline"
                  >
                    Add metadata
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
