"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShareButton } from "@/components/share-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function TermDetailPage(props: PageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [candidates, setCandidates] = useState<
    Array<{ id: string; text: string; source: string; weight: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    props.params.then((p) => {
      if (!mounted) return;
      setSlug(p.slug);
    });
    return () => {
      mounted = false;
    };
  }, [props.params]);

  useEffect(() => {
    let aborted = false;
    async function load() {
      if (!slug) return;
      setIsLoading(true);
      const res = await fetch(`/api/term/${slug}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : {};
      if (aborted) return;
      setName(data.term);
      setCandidates(data.candidates ?? []);
      setIsLoading(false);
    }
    load();
    return () => {
      aborted = true;
    };
  }, [slug]);

  const decoded = name || (slug ? decodeURIComponent(slug) : "");

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold">{decoded}</h1>
        <div className="flex items-center gap-3">
          {candidates.length > 0 && decoded && (
            <ShareButton
              term={decoded}
              candidates={candidates}
              slug={slug || ""}
            />
          )}
          {decoded && (
            <Link
              className="underline"
              href={`/upload?term=${encodeURIComponent(decoded)}`}
            >
              Upload definition
            </Link>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Candidate definitions</h2>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : candidates.length > 0 ? (
            candidates.map((c) => (
              <DefinitionCard
                key={c.id}
                text={c.text}
                source={`${c.source} · weight ${c.weight.toFixed(2)}`}
              />
            ))
          ) : (
            <p className="text-muted-foreground">No candidates yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">History & provenance</h2>
        <p className="text-sm text-muted-foreground">
          Backed by Supabase with public read access; contributions require
          sign-in.
        </p>
      </section>
    </div>
  );
}

function DefinitionCard({ text, source }: { text: string; source: string }) {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <p>{text}</p>
      <p className="text-xs text-muted-foreground">Source: {source}</p>
    </div>
  );
}
