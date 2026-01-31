"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/auth-button";

export function TopNav() {
  return (
    <header className="w-full sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
        <Link href="/" className="font-semibold tracking-tight">
          Ambiguity
        </Link>
        <nav className="flex items-center gap-2 ml-auto">
          <Link href="/sources">
            <Button variant="secondary" size="sm">
              Sources
            </Button>
          </Link>
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
