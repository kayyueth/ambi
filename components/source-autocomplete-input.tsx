"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type SourceSuggestion = {
  value: string;
  label: string;
  kind: "metadata" | "existing";
};

type Props = {
  id?: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function SourceAutocompleteInput({
  id,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<SourceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const trimmedValue = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    if (!isInputFocused) return;

    const q = trimmedValue;
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const [metaRes, existingRes] = await Promise.all([
          fetch(`/api/sources?q=${encodeURIComponent(q)}&limit=8`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(
            `/api/search/autocomplete?type=source&q=${encodeURIComponent(q)}`,
            { cache: "no-store", signal: controller.signal }
          ),
        ]);

        const next: SourceSuggestion[] = [];

        if (metaRes.ok) {
          const data = (await metaRes.json().catch(() => ({}))) as {
            sources?: Array<{ title?: string | null }>;
          };
          for (const item of data.sources ?? []) {
            const title = typeof item.title === "string" ? item.title.trim() : "";
            if (!title) continue;
            next.push({ value: title, label: title, kind: "metadata" });
          }
        }

        if (existingRes.ok) {
          const data = (await existingRes.json().catch(() => ({}))) as {
            suggestions?: Array<{ value?: string; label?: string }>;
          };
          for (const item of data.suggestions ?? []) {
            const v = typeof item.value === "string" ? item.value.trim() : "";
            if (!v) continue;
            next.push({
              value: v,
              label: typeof item.label === "string" ? item.label : v,
              kind: "existing",
            });
          }
        }

        const unique = new Map<string, SourceSuggestion>();
        for (const item of next) {
          const key = normalizeKey(item.value);
          if (!key) continue;
          if (!unique.has(key)) unique.set(key, item);
          // Prefer metadata if both exist.
          else if (unique.get(key)?.kind !== "metadata" && item.kind === "metadata") {
            unique.set(key, item);
          }
        }

        const results = Array.from(unique.values())
          .filter((s) => normalizeKey(s.value) !== normalizeKey(q))
          .slice(0, 8);

        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        // Ignore aborted / network errors.
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmedValue, isInputFocused]);

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onFocus={() => setIsInputFocused(true)}
        onChange={(e) => {
          onValueChange(e.target.value);
          if (!isInputFocused) setIsInputFocused(true);
        }}
        onBlur={(e) => {
          const target = e.relatedTarget as HTMLElement | null;
          setTimeout(() => {
            if (!target || !target.closest(".suggestions-dropdown")) {
              setIsInputFocused(false);
              setShowSuggestions(false);
            }
          }, 200);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            setShowSuggestions(false);
            setIsInputFocused(false);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
          <ul className="py-1">
            {suggestions.map((suggestion, idx) => (
              <li key={`${suggestion.value}:${idx}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onValueChange(suggestion.value);
                    setShowSuggestions(false);
                    setIsInputFocused(false);
                  }}
                >
                  <span className="truncate">{suggestion.label}</span>
                  {suggestion.kind === "metadata" && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Metadata
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

