"use client";

import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";

interface Suggestion {
  value: string;
  label: string;
  slug?: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initial = searchParams?.get("q") ?? "";
  const initialSource = searchParams?.get("source") ?? "";
  const [searchMode, setSearchMode] = useState<"term" | "source">(
    initialSource ? "source" : "term"
  );
  const [query, setQuery] = useState(initial);
  const [source, setSource] = useState(initialSource);
  const [results, setResults] = useState<Array<{ term: string; slug: string }>>(
    []
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(
    function syncFromParams() {
      setQuery(initial);
      setSource(initialSource);
      setSearchMode(initialSource ? "source" : "term");
    },
    [initial, initialSource]
  );

  // Autocomplete suggestions
  useEffect(
    function fetchSuggestions() {
      let aborted = false;
      const currentValue = searchMode === "source" ? source : query;

      if (!currentValue.trim() || currentValue.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Note: We allow fetching even if not explicitly focused, as long as user is typing
      // The dropdown will only show if there are suggestions and input is focused

      const timeoutId = setTimeout(async () => {
        try {
          const url = `/api/search/autocomplete?q=${encodeURIComponent(
            currentValue
          )}&type=${searchMode}`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            console.error("Autocomplete response not OK:", res.status);
            if (!aborted) {
              setSuggestions([]);
              setShowSuggestions(false);
            }
            return;
          }
          if (aborted) return;
          const data = await res.json();
          if (aborted) return;
          const newSuggestions = data.suggestions || [];
          setSuggestions(newSuggestions);
          // Show suggestions if we have any and input is focused (or was recently used)
          setShowSuggestions(newSuggestions.length > 0);
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
    [query, source, searchMode, isInputFocused]
  );

  useEffect(
    function runSearch() {
      let aborted = false;
      async function search() {
        const params = new URLSearchParams();

        if (searchMode === "source") {
          if (source.trim()) {
            params.set("source", source);
          }
        } else {
          if (query.trim()) {
            params.set("q", query);
          } else {
            params.set("q", "%");
          }
        }

        const res = await fetch(`/api/search?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok || aborted) return;
        const data = await res.json();
        if (aborted) return;
        setResults(data.results ?? []);
      }
      search();
      return () => {
        aborted = true;
      };
    },
    [query, source, searchMode]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <Tabs
        value={searchMode}
        onValueChange={(v) => {
          setSearchMode(v as "term" | "source");
          setShowSuggestions(false);
          setSuggestions([]);
          setIsInputFocused(false);
        }}
      >
        <TabsList>
          <TabsTrigger value="term">Search by Term</TabsTrigger>
          <TabsTrigger value="source">Search by Source/Book</TabsTrigger>
        </TabsList>
        <TabsContent value="term" className="space-y-3">
          <div className="relative w-full">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={query}
                  onFocus={() => {
                    setIsInputFocused(true);
                  }}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    // Ensure input is marked as focused when user types
                    if (!isInputFocused) {
                      setIsInputFocused(true);
                    }
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
                  placeholder="Search terms…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setShowSuggestions(false);
                      setIsInputFocused(false);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setIsInputFocused(false);
                    }
                  }}
                  className="w-full"
                />
                {showSuggestions &&
                  searchMode === "term" &&
                  suggestions.length > 0 && (
                    <div className="suggestions-dropdown absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                      <ul className="py-1">
                        {suggestions.map((suggestion, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setQuery(suggestion.value);
                                setShowSuggestions(false);
                                setIsInputFocused(false);
                                if (suggestion.slug) {
                                  window.location.href = `/term/${suggestion.slug}`;
                                }
                              }}
                            >
                              {suggestion.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              <Button onClick={() => setQuery(query)}>Search</Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="source" className="space-y-3">
          <div className="relative w-full">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={source}
                  onFocus={() => {
                    setIsInputFocused(true);
                  }}
                  onChange={(e) => {
                    setSource(e.target.value);
                    // Ensure input is marked as focused when user types
                    if (!isInputFocused) {
                      setIsInputFocused(true);
                    }
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
                  placeholder="Search by book, source, or reference…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setShowSuggestions(false);
                      setIsInputFocused(false);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setIsInputFocused(false);
                    }
                  }}
                  className="w-full"
                />
                {showSuggestions &&
                  searchMode === "source" &&
                  suggestions.length > 0 && (
                    <div className="suggestions-dropdown absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                      <ul className="py-1">
                        {suggestions.map((suggestion, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSource(suggestion.value);
                                setShowSuggestions(false);
                                setIsInputFocused(false);
                              }}
                            >
                              {suggestion.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              <Button onClick={() => setSource(source)}>Search</Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Find all terms from a specific book or source
          </p>
        </TabsContent>
      </Tabs>
      <div>
        <h2 className="text-lg font-medium mb-3">
          {searchMode === "source" && source.trim()
            ? `Terms from "${source}"`
            : searchMode === "term" && query.trim()
            ? `Results for "${query}"`
            : "Results"}
        </h2>
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
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Search</h1>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
