"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/context";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<
    Array<{
      id: string;
      body: string;
      user_id: string | null;
      created_at: string;
    }>
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  const [newComment, setNewComment] = useState<string>("");
  const [isPosting, setIsPosting] = useState(false);
  const { user } = useAuth();
  const [hasClickedDefinition, setHasClickedDefinition] = useState(false);
  const commentsEndRef = useMemo(
    () => ({ current: null as null | HTMLDivElement }),
    []
  );

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

  useEffect(() => {
    if (candidates.length > 0 && !selectedId) {
      setSelectedId(candidates[0].id);
    }
  }, [candidates, selectedId]);

  useEffect(() => {
    let aborted = false;
    async function fetchComments(defId: string) {
      setIsFetchingComments(true);
      const res = await fetch(
        `/api/comments?definitionId=${encodeURIComponent(defId)}`,
        { cache: "no-store" }
      );
      const data = res.ok ? await res.json() : {};
      if (aborted) return;
      setComments(data.comments ?? []);
      setIsFetchingComments(false);
    }
    if (selectedId) fetchComments(selectedId);
    return () => {
      aborted = true;
    };
  }, [selectedId]);

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : candidates.length > 0 ? (
              candidates.map(
                (c: {
                  id: string;
                  text: string;
                  source: string;
                  weight: number;
                  username?: string;
                }) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setHasClickedDefinition(true);
                    }}
                    className={`rounded-md border p-4 text-left transition-colors ${
                      selectedId === c.id
                        ? "border-ring bg-ring/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <p className="mb-2">{c.text}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Source: {c.source}</span>
                      <span>•</span>
                      <span>weight {c.weight.toFixed(2)}</span>
                      <span>•</span>
                      <span>{c.username || "Anonymous"}</span>
                    </div>
                  </button>
                )
              )
            ) : (
              <p className="text-muted-foreground">No candidates yet.</p>
            )}
          </div>

          {selectedId &&
            (comments.length > 0 || (user && hasClickedDefinition)) && (
              <aside className="lg:col-span-1">
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-medium">Comments</h3>
                    <span className="text-xs text-muted-foreground">
                      {comments.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {isFetchingComments ? (
                      <ul className="space-y-2">
                        <li className="rounded border p-2">
                          <Skeleton className="h-12 w-full" />
                        </li>
                        <li className="rounded border p-2">
                          <Skeleton className="h-10 w-3/4" />
                        </li>
                        <li className="rounded border p-2">
                          <Skeleton className="h-14 w-full" />
                        </li>
                      </ul>
                    ) : comments.length > 0 ? (
                      <ul className="space-y-2">
                        {comments.map(
                          (cm: {
                            id: string;
                            body: string;
                            user_id: string | null;
                            created_at: string;
                            username?: string;
                          }) => {
                            const isOwner = user?.id === cm.user_id;
                            const isEditing = editingId === cm.id;
                            return (
                              <li key={cm.id} className="rounded border p-2">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingText}
                                      onChange={(e) =>
                                        setEditingText(e.target.value)
                                      }
                                    />
                                    <div className="flex items-center gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setEditingId(null);
                                          setEditingText("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          const text = editingText.trim();
                                          if (text.length === 0) return;
                                          const res = await fetch(
                                            `/api/comments/${cm.id}`,
                                            {
                                              method: "PATCH",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                body: text,
                                              }),
                                            }
                                          );
                                          if (!res.ok) return;
                                          const data = await res.json();
                                          setComments((prev) =>
                                            prev.map((c) =>
                                              c.id === cm.id ? data.comment : c
                                            )
                                          );
                                          setEditingId(null);
                                          setEditingText("");
                                        }}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-sm">{cm.body}</p>
                                    <div className="mt-1 flex items-center justify-between">
                                      <p className="text-[11px] text-muted-foreground">
                                        {cm.username || "Anonymous"} ·{" "}
                                        {new Date(
                                          cm.created_at
                                        ).toLocaleString()}
                                      </p>
                                      {isOwner && (
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingId(cm.id);
                                              setEditingText(cm.body);
                                            }}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              const res = await fetch(
                                                `/api/comments/${cm.id}`,
                                                { method: "DELETE" }
                                              );
                                              if (!res.ok) return;
                                              setComments((prev) =>
                                                prev.filter(
                                                  (c) => c.id !== cm.id
                                                )
                                              );
                                            }}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          }
                        )}
                      </ul>
                    ) : null}

                    {user && hasClickedDefinition && (
                      <div className="pt-2">
                        <Textarea
                          placeholder={"Write a comment…"}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={async (e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                              e.preventDefault();
                              const text = newComment.trim();
                              if (!selectedId || text.length === 0 || isPosting)
                                return;
                              setIsPosting(true);
                              const tempId = `temp-${Date.now()}`;
                              const optimistic = {
                                id: tempId,
                                body: text,
                                user_id: user.id,
                                created_at: new Date().toISOString(),
                              };
                              setComments((prev) => [...prev, optimistic]);
                              setNewComment("");
                              try {
                                const res = await fetch("/api/comments", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    definitionId: selectedId,
                                    body: text,
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setComments((prev) =>
                                    prev.map((c) =>
                                      c.id === tempId ? data.comment : c
                                    )
                                  );
                                } else {
                                  setComments((prev) =>
                                    prev.filter((c) => c.id !== tempId)
                                  );
                                }
                              } finally {
                                setIsPosting(false);
                                setTimeout(() => {
                                  (
                                    commentsEndRef.current as HTMLDivElement | null
                                  )?.scrollIntoView({ behavior: "smooth" });
                                }, 0);
                              }
                            }
                          }}
                          disabled={isPosting}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button
                            onClick={async () => {
                              if (!selectedId) return;
                              const text = newComment.trim();
                              if (text.length === 0) return;
                              setIsPosting(true);
                              const tempId = `temp-${Date.now()}`;
                              const optimistic = {
                                id: tempId,
                                body: text,
                                user_id: user.id,
                                created_at: new Date().toISOString(),
                              };
                              setComments((prev) => [...prev, optimistic]);
                              setNewComment("");
                              try {
                                const res = await fetch("/api/comments", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    definitionId: selectedId,
                                    body: text,
                                  }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setComments((prev) =>
                                    prev.map((c) =>
                                      c.id === tempId ? data.comment : c
                                    )
                                  );
                                } else {
                                  setComments((prev) =>
                                    prev.filter((c) => c.id !== tempId)
                                  );
                                }
                              } finally {
                                setIsPosting(false);
                                setTimeout(() => {
                                  (
                                    commentsEndRef.current as HTMLDivElement | null
                                  )?.scrollIntoView({ behavior: "smooth" });
                                }, 0);
                              }
                            }}
                            disabled={
                              isPosting || newComment.trim().length === 0
                            }
                          >
                            {isPosting ? "Posting…" : "Post"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {!user && (
                      <p className="pt-2 text-xs text-muted-foreground">
                        <Link href="/auth/signin" className="underline">
                          Sign in
                        </Link>{" "}
                        to comment.
                      </p>
                    )}
                    <div
                      ref={(el) => {
                        commentsEndRef.current = el;
                      }}
                    />
                  </div>
                </div>
              </aside>
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
