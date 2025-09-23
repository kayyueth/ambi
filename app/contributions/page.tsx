"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState } from "react";
import Link from "next/link";

function ContributionsPageContent() {
  const { user } = useAuth();

  interface ContributionItem {
    id: string;
    text: string;
    source: string;
    weight: number | null;
    userId: string;
    status: "draft" | "pending" | "published" | "rejected";
    createdAt: string;
    updatedAt: string;
    term?: string | null;
    slug?: string | null;
  }

  interface ContributionsGrouped {
    draft: ContributionItem[];
    published: ContributionItem[];
    rejected: ContributionItem[];
    comments?: Array<{
      id: string;
      body: string;
      createdAt: string;
      updatedAt: string;
      definitionId: string;
      term?: string | null;
      slug?: string | null;
    }>;
  }

  const [data, setData] = useState<ContributionsGrouped | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      setIsLoading(true);
      setHasError(null);
      try {
        const res = await fetch(
          `/api/contributions?userId=${encodeURIComponent(user.id)}`
        );
        if (!res.ok) throw new Error("Failed to load contributions");
        const json = await res.json();
        setData(json.data as ContributionsGrouped);
      } catch (e) {
        setHasError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Contributions</h1>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {hasError && <p className="text-sm text-red-600">{hasError}</p>}
      {!isLoading && !hasError && (
        <div className="grid gap-4 sm:grid-cols-3">
          <section className="rounded-md border p-4">
            <h2 className="font-medium mb-2">Published</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data && data.published.length > 0 ? (
                data.published.map((item) => (
                  <li key={item.id} className="text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block line-clamp-2">{item.text}</span>
                        {item.slug && (
                          <Link
                            href={`/term/${item.slug}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View term
                          </Link>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <li>None</li>
              )}
            </ul>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="font-medium mb-2">Comments</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data &&
              Array.isArray((data as any).comments) &&
              (data as any).comments.length > 0 ? (
                (data as any).comments.map((c: any) => (
                  <li key={c.id} className="text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block line-clamp-2">{c.body}</span>
                        {c.slug && (
                          <Link
                            href={`/term/${c.slug}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View term
                          </Link>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <li>No comments</li>
              )}
            </ul>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="font-medium mb-2">Drafts</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data &&
              Array.isArray((data as any).draft) &&
              data.draft.length > 0 ? (
                data.draft.map((item) => (
                  <li key={item.id} className="text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block line-clamp-2">{item.text}</span>
                        {item.slug && (
                          <Link
                            href={`/term/${item.slug}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View term
                          </Link>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <li>No drafts</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

export default function ContributionsPage() {
  return (
    <ProtectedRoute>
      <ContributionsPageContent />
    </ProtectedRoute>
  );
}
