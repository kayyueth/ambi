"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Suggestion {
  value: string;
  label: string;
  slug?: string;
  type?: "term" | "source";
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [results, setResults] = useState<Array<{ term: string; slug: string }>>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Autocomplete suggestions
  useEffect(
    function fetchSuggestions() {
      let aborted = false;

      if (!query.trim() || query.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const timeoutId = setTimeout(async () => {
        try {
          // Fetch both term and source suggestions in parallel
          const [termRes, sourceRes] = await Promise.all([
            fetch(
              `/api/search/autocomplete?q=${encodeURIComponent(
                query
              )}&type=term`,
              { cache: "no-store" }
            ),
            fetch(
              `/api/search/autocomplete?q=${encodeURIComponent(
                query
              )}&type=source`,
              { cache: "no-store" }
            ),
          ]);

          if (aborted) return;

          const termData = termRes.ok
            ? await termRes.json()
            : { suggestions: [] };
          const sourceData = sourceRes.ok
            ? await sourceRes.json()
            : { suggestions: [] };

          if (aborted) return;

          // Combine suggestions with type indicators
          const termSuggestions =
            (termData.suggestions || []).map((s: Suggestion) => ({
              ...s,
              type: "term" as const,
            })) || [];

          const sourceSuggestions =
            (sourceData.suggestions || []).map((s: Suggestion) => ({
              ...s,
              type: "source" as const,
            })) || [];

          // Combine and limit to 8 total (prioritize terms, then sources)
          const combined = [
            ...termSuggestions.slice(0, 6),
            ...sourceSuggestions.slice(
              0,
              8 - termSuggestions.slice(0, 6).length
            ),
          ];

          setSuggestions(combined);
          setShowSuggestions(combined.length > 0);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          if (!aborted) {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      }, 300); // Debounce 300ms

      return () => {
        aborted = true;
        clearTimeout(timeoutId);
      };
    },
    [query, isInputFocused]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  useEffect(() => {
    if (!mounted) return;

    let aborted = false;
    async function loadInitial() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=%`, { cache: "no-store" });
        const data = await res.json();
        if (!aborted) {
          setResults(data.results ?? []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (!aborted) setResults([]);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }
    loadInitial();
    return () => {
      aborted = true;
    };
  }, [mounted]);

  return (
    <div className="space-y-10 py-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          Ambiguity · Public Definitions
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Extract, browse, and review the best shared definitions. Build a
          common language layer for everyone.
        </p>
        <form onSubmit={onSubmit} className="mx-auto max-w-xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!isInputFocused) {
                    setIsInputFocused(true);
                  }
                }}
                onFocus={() => {
                  setIsInputFocused(true);
                }}
                onBlur={(e) => {
                  // Delay to allow click on suggestion
                  const target = e.relatedTarget as HTMLElement;
                  setTimeout(() => {
                    if (!target || !target.closest(".suggestions-dropdown")) {
                      setIsInputFocused(false);
                      setShowSuggestions(false);
                    }
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowSuggestions(false);
                    setIsInputFocused(false);
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                    setIsInputFocused(false);
                  }
                }}
                placeholder="Search a term…"
                aria-label="Search terms"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                  <ul className="py-1">
                    {suggestions.map((suggestion, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQuery(suggestion.value);
                            setShowSuggestions(false);
                            setIsInputFocused(false);
                            if (suggestion.type === "source") {
                              // Navigate to source search
                              router.push(
                                `/search?source=${encodeURIComponent(
                                  suggestion.value
                                )}`
                              );
                            } else if (suggestion.slug) {
                              // Navigate to term page
                              router.push(`/term/${suggestion.slug}`);
                            } else {
                              // Navigate to term search
                              router.push(
                                `/search?q=${encodeURIComponent(
                                  suggestion.value
                                )}`
                              );
                            }
                          }}
                        >
                          <span>{suggestion.label}</span>
                          {suggestion.type === "source" && (
                            <span className="text-xs text-muted-foreground">
                              Source
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button type="submit">Search</Button>
          </div>
        </form>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-muted-foreground">Quick links:</span>
          <Link className="underline" href="/review">
            Review
          </Link>
          <Link className="underline" href="/upload">
            Upload
          </Link>
          <Link className="underline" href="/contributions">
            My contributions
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Browse Existing Terms</h2>
          <p className="text-muted-foreground">
            Explore our growing collection of definitions and concepts.
          </p>
        </div>

        <div className="flex justify-center">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </section>

      {viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-center col-span-full">Loading…</p>}
          {!isLoading && results.length === 0 && (
            <p className="text-center col-span-full text-muted-foreground">
              No terms found.
            </p>
          )}
          {!isLoading &&
            results.map((t) => (
              <Card
                key={t.slug}
                className="p-6 space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/term/${t.slug}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {t.term}
                  </Link>
                  <Link
                    href={`/term/${t.slug}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View →
                  </Link>
                </div>
              </Card>
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          {isLoading && <p className="text-center">Loading…</p>}
          {!isLoading &&
            results.map((t) => (
              <div
                key={t.slug}
                className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 px-1 rounded"
              >
                <Link
                  href={`/term/${t.slug}`}
                  className="font-medium text-gray-900 hover:text-blue-600 hover:underline truncate"
                >
                  {t.term}
                </Link>
                <Link
                  href={`/term/${t.slug}`}
                  className="text-sm text-blue-600 hover:text-blue-800 ml-4 flex-shrink-0"
                >
                  →
                </Link>
              </div>
            ))}
        </div>
      )}

      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <p className="text-muted-foreground">
            Three simple ways to build and explore our shared knowledge base.
          </p>
        </div>

        <div className="space-y-6">
          <FeatureCard
            number="1"
            title="Search & Explore"
            description="Find terms like a dictionary, navigate related concepts."
            icon="🔍"
          />
          <FeatureCard
            number="2"
            title="Upload & Extract"
            description="Submit definitions manually or via PDF/Image & OCR."
            icon="📄"
          />
          <FeatureCard
            number="3"
            title="Review by Cards"
            description="Swipe left/right to tune weights and surface the best."
            icon="⚖️"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex items-start gap-6 p-6 rounded-xl border">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border">
          {number}
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
}) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <Button
        variant={viewMode === "card" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("card")}
        className="flex items-center gap-2"
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
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        Cards
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("list")}
        className="flex items-center gap-2"
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
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        List
      </Button>
    </div>
  );
}
