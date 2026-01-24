"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ source: string }>;
}

interface SourceMetadata {
  id: string;
  title: string;
  author: string | null;
  year: string | null;
  publisher: string | null;
  isbn: string | null;
  cover_url?: string | null;
  openlibrary_key?: string | null;
}

interface SourceTerm {
  id: string;
  term: string;
  slug: string;
  text: string;
  weight: number | null;
  updatedAt: string;
}

function summarize(text: string, maxLength = 200) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function SourceDetailPage(props: PageProps) {
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SourceMetadata | null>(null);
  const [terms, setTerms] = useState<SourceTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    props.params.then((p) => {
      if (!mounted) return;
      setSourceTitle(safeDecode(p.source));
    });
    return () => {
      mounted = false;
    };
  }, [props.params]);

  useEffect(() => {
    if (!sourceTitle) return;
    let aborted = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [metaRes, termsRes] = await Promise.all([
          fetch(`/api/sources?title=${encodeURIComponent(sourceTitle)}`, {
            cache: "no-store",
          }),
          fetch(`/api/sources/terms?source=${encodeURIComponent(sourceTitle)}`, {
            cache: "no-store",
          }),
        ]);

        if (!aborted) {
          if (metaRes.ok) {
            const metaData = await metaRes.json();
            setMetadata(metaData.source ?? null);
          } else {
            setMetadata(null);
          }

          if (termsRes.ok) {
            const termsData = await termsRes.json();
            setTerms(termsData.results ?? []);
          } else {
            setTerms([]);
          }
        }
      } catch (err) {
        if (!aborted) {
          setError((err as Error).message);
        }
      } finally {
        if (!aborted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [sourceTitle]);

  const metadataRows = useMemo(() => {
    if (!metadata) return [];
    return [
      { label: "Author", value: metadata.author },
      { label: "Year", value: metadata.year },
      { label: "Publisher", value: metadata.publisher },
      { label: "ISBN", value: metadata.isbn },
    ].filter((row) => row.value);
  }, [metadata]);

  const metadataHref = sourceTitle
    ? metadata?.id
      ? `/sources/new?id=${metadata.id}`
      : `/sources/new?title=${encodeURIComponent(sourceTitle)}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">
            {metadata?.title ?? sourceTitle ?? "Source"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Public source details and published definitions.
          </p>
        </div>
        {sourceTitle && (
          <Link href={metadataHref}>
            <Button variant="outline" size="sm">
              {metadata ? "Edit metadata" : "Add metadata"}
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {metadata ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Source metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {metadata.cover_url && (
              <div className="flex items-start gap-3 pb-2">
                <img
                  src={metadata.cover_url}
                  alt="Cover"
                  className="h-28 w-20 rounded border object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  Cover image (if available).
                </div>
              </div>
            )}
            {metadataRows.length > 0 ? (
              metadataRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground">{row.value}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Metadata is currently empty.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Source metadata</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No metadata yet. Add it to help others file definitions.
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-medium">Definitions</h2>
          <Badge variant="secondary">{terms.length}</Badge>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : terms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published definitions for this source yet.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {terms.map((item) => (
              <Card key={item.id} className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {item.slug ? (
                      <Link
                        href={`/term/${item.slug}`}
                        className="hover:underline"
                      >
                        {item.term}
                      </Link>
                    ) : (
                      item.term
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {summarize(item.text)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Updated{" "}
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                    {typeof item.weight === "number" && (
                      <>
                        <span>•</span>
                        <span>Weight {item.weight.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
