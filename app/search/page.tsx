"use client";

import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { searchTerms } from "@/lib/mock-data";

export default function SearchPage() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<Array<{ term: string; slug: string }>>(
    []
  );

  useEffect(
    function syncFromParams() {
      setQuery(initial);
    },
    [initial]
  );

  useEffect(
    function runSearch() {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const found = searchTerms(query).map((t) => ({
        term: t.term,
        slug: t.slug,
      }));
      setResults(found);
    },
    [query]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms…"
        />
        <Button onClick={() => setQuery(query)}>Search</Button>
      </div>
      <ul className="space-y-2">
        {results.map((item) => (
          <li key={item.slug}>
            <Link className="underline" href={`/term/${item.slug}`}>
              {item.term}
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <li className="text-muted-foreground">No results</li>
        )}
      </ul>
    </div>
  );
}
