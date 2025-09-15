"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

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

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Search & Explore"
          description="Find terms like a dictionary, navigate related concepts."
        />
        <FeatureCard
          title="Upload & Extract"
          description="Submit definitions manually or via PDF/Image & OCR."
        />
        <FeatureCard
          title="Review by Cards"
          description="Swipe left/right to tune weights and surface the best."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-6 space-y-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
