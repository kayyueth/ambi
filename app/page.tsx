"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TERMS, type TermEntry } from "@/lib/mock-data";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-10 py-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          Ambi · Public Definitions
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Extract, browse, and review the best shared definitions. Build a
          common language layer for everyone.
        </p>
        <form onSubmit={onSubmit} className="mx-auto max-w-xl flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a term…"
            aria-label="Search terms"
          />
          <Button type="submit">Search</Button>
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
          {TERMS.map((term) => (
            <TermCard key={term.slug} term={term} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {TERMS.map((term) => (
            <TermListItem key={term.slug} term={term} />
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
    <div className="flex items-start gap-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
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

function TermCard({ term }: { term: TermEntry }) {
  const bestDefinition = term.candidates.reduce((best, current) =>
    current.weight > best.weight ? current : best
  );

  return (
    <Card className="p-6 space-y-4 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            href={`/term/${term.slug}`}
            className="text-lg font-semibold hover:underline"
          >
            {term.term}
          </Link>
          <Badge variant="secondary">
            {term.candidates.length} definition
            {term.candidates.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {bestDefinition.text}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{bestDefinition.source}</span>
          <span>Weight: {bestDefinition.weight.toFixed(2)}</span>
        </div>
      </div>

      <div className="pt-2 border-t">
        <Link
          href={`/term/${term.slug}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View all definitions →
        </Link>
      </div>
    </Card>
  );
}

function TermListItem({ term }: { term: TermEntry }) {
  const bestDefinition = term.candidates.reduce((best, current) =>
    current.weight > best.weight ? current : best
  );

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 px-1 rounded">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/term/${term.slug}`}
            className="font-medium text-gray-900 hover:text-blue-600 hover:underline truncate"
          >
            {term.term}
          </Link>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {term.candidates.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
          {bestDefinition.text}
        </p>
      </div>

      <Link
        href={`/term/${term.slug}`}
        className="text-sm text-blue-600 hover:text-blue-800 ml-4 flex-shrink-0"
      >
        →
      </Link>
    </div>
  );
}
