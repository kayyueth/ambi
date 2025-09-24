"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthButton } from "@/components/auth-button";

export function TopNav() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="w-full sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
        <Link href="/" className="font-semibold tracking-tight">
          Ambiguity
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <form onSubmit={onSearchSubmit} className="flex-1 max-w-xl">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms…"
          />
        </form>
        <nav className="flex items-center gap-2 ml-auto">
          <Link href="/upload">
            <Button variant="secondary" size="sm">
              Upload
            </Button>
          </Link>
          <Link href="/review">
            <Button variant="secondary" size="sm">
              Review
            </Button>
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}

export default TopNav;
