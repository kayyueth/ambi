"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditContributionDialog } from "@/components/edit-contribution-dialog";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

function ContributionsPageContent() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

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

  interface CommentItem {
    id: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    definitionId: string;
    term?: string | null;
    slug?: string | null;
  }

  interface ContributionsGrouped {
    draft: ContributionItem[];
    pending?: ContributionItem[];
    published: ContributionItem[];
    rejected: ContributionItem[];
    comments?: CommentItem[];
  }

  interface SourceMetadata {
    id: string;
    title: string;
    author?: string | null;
    year?: string | null;
    publisher?: string | null;
    isbn?: string | null;
    cover_url?: string | null;
    openlibrary_key?: string | null;
  }

  interface SourceCard {
    title: string;
    count: number;
    latestUpdatedAt: string;
    latestUpdatedAtMs: number;
    preview: string;
    latestTerm: string | null;
  }

  const [data, setData] = useState<ContributionsGrouped | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);

  // profile form state
  interface ProfileFormState {
    username: string;
    subject: string[];
    school: string;
  }
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    username: "",
    subject: [],
    school: "",
  });
  const [isProfileFetching, setIsProfileFetching] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");
  const [reputation, setReputation] = useState(0);
  const [reputationSeries, setReputationSeries] = useState<
    Array<{ date: string; value: number }>
  >([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [sourceMetadata, setSourceMetadata] = useState<
    Record<string, SourceMetadata>
  >({});
  const [isSourceMetaLoading, setIsSourceMetaLoading] = useState(false);
  const [contribTab, setContribTab] = useState<
    "sources" | "published" | "drafts" | "comments"
  >("sources");

  // Edit dialog state
  const [editingContribution, setEditingContribution] =
    useState<ContributionItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Delete dialog state
  const [deletingContribution, setDeletingContribution] =
    useState<ContributionItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // load profile
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!user?.id) return;
      setIsProfileFetching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("username, subject, school")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && !error && data) {
        setProfileForm({
          username: data.username ?? "",
          subject: Array.isArray(data.subject) ? data.subject : [],
          school: data.school ?? "",
        });
      }
      setIsProfileFetching(false);
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  // compute reputation from contributions (sum of published weights)
  useEffect(() => {
    if (!data) {
      setReputation(0);
      setReputationSeries([]);
      setActivity({});
      return;
    }
    const publishedSorted = [...(data.published || [])].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let running = 0;
    const series = publishedSorted.map((item) => {
      const w = typeof item.weight === "number" ? item.weight : 0.5;
      running += w;
      return { date: item.createdAt, value: Math.round(running * 10) / 10 };
    });
    const total = running;
    setReputation(Math.round(total * 10) / 10);
    setReputationSeries(series);

    // activity: count contributions per day (all contributions, not only published)
    const allItems: (ContributionItem | CommentItem)[] = [
      ...(data.published || []),
      ...(data.draft || []),
      ...(data?.comments || []),
    ];
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      const d = new Date(item.createdAt);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        .toISOString()
        .slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    }
    setActivity(counts);
  }, [data]);

  function summarizeText(text: string, maxLength = 160) {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
  }

  const sourceCards = useMemo<SourceCard[]>(() => {
    if (!data) return [];
    const allItems: ContributionItem[] = [
      ...(data.published || []),
      ...(data.draft || []),
      ...(data.rejected || []),
      ...(data.pending || []),
    ];
    const grouped = new Map<string, SourceCard>();

    for (const item of allItems) {
      const title = item.source?.trim();
      if (!title) continue;
      const updatedAtMs = new Date(item.updatedAt).getTime();
      const existing = grouped.get(title);
      if (!existing) {
        grouped.set(title, {
          title,
          count: 1,
          latestUpdatedAt: item.updatedAt,
          latestUpdatedAtMs: updatedAtMs,
          preview: summarizeText(item.text),
          latestTerm: item.term ?? null,
        });
        continue;
      }

      existing.count += 1;
      if (updatedAtMs > existing.latestUpdatedAtMs) {
        existing.latestUpdatedAtMs = updatedAtMs;
        existing.latestUpdatedAt = item.updatedAt;
        existing.preview = summarizeText(item.text);
        existing.latestTerm = item.term ?? null;
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.latestUpdatedAtMs - a.latestUpdatedAtMs
    );
  }, [data]);

  useEffect(() => {
    if (sourceCards.length === 0) {
      setSourceMetadata({});
      return;
    }

    let aborted = false;
    async function loadSourceMetadata() {
      setIsSourceMetaLoading(true);
      try {
        const res = await fetch("/api/sources/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titles: sourceCards.map((card) => card.title),
          }),
        });

        if (!res.ok) {
          if (!aborted) setSourceMetadata({});
          return;
        }

        const json = await res.json();
        if (aborted) return;
        const mapped = (json.sources ?? []).reduce(
          (acc: Record<string, SourceMetadata>, item: SourceMetadata) => {
            acc[item.title] = item;
            return acc;
          },
          {}
        );
        setSourceMetadata(mapped);
      } catch (error) {
        if (!aborted) {
          console.error("Failed to load source metadata:", error);
          setSourceMetadata({});
        }
      } finally {
        if (!aborted) setIsSourceMetaLoading(false);
      }
    }

    loadSourceMetadata();
    return () => {
      aborted = true;
    };
  }, [sourceCards]);

  function onProfileChange<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSubject() {
    const trimmed = subjectInput.trim();
    if (trimmed && !profileForm.subject.includes(trimmed)) {
      setProfileForm((prev) => ({
        ...prev,
        subject: [...prev.subject, trimmed],
      }));
      setSubjectInput("");
    }
  }

  function removeSubject(subjectToRemove: string) {
    setProfileForm((prev) => ({
      ...prev,
      subject: prev.subject.filter((s) => s !== subjectToRemove),
    }));
  }

  function handleSubjectInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject();
    }
  }

  async function onProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setIsProfileSaving(true);
    const payload = { id: user.id, ...profileForm };
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    setIsProfileSaving(false);
    if (error) {
      console.error("Profile save error:", error.message);
    } else {
      console.log("Profile saved successfully");
      setIsEditingProfile(false);
    }
  }

  function handleEditContribution(contribution: ContributionItem) {
    setEditingContribution(contribution);
    setIsEditDialogOpen(true);
  }

  async function handleSaveContribution(
    id: string,
    data: { text: string; source: string; term: string }
  ) {
    const res = await fetch(`/api/contributions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result?.error ?? "Failed to update contribution");
    }

    // Reload the contributions data
    if (user?.id) {
      const res = await fetch(
        `/api/contributions?userId=${encodeURIComponent(user.id)}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data as ContributionsGrouped);
      }
    }
  }

  function handleDeleteContribution(contribution: ContributionItem) {
    setDeletingContribution(contribution);
    setIsDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingContribution) return;

    setIsDeleting(true);
    setHasError(null);

    try {
      const res = await fetch(`/api/contributions/${deletingContribution.id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error ?? "Failed to delete contribution");
      }

      // Close the delete dialog
      setIsDeleteDialogOpen(false);
      setDeletingContribution(null);

      // Reload the contributions data
      if (user?.id) {
        const res = await fetch(
          `/api/contributions?userId=${encodeURIComponent(user.id)}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json.data as ContributionsGrouped);
        }
      }
    } catch (error) {
      console.error("Delete error:", error);
      setHasError((error as Error).message);
      // Keep the dialog open so user can try again
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-md border p-4 max-w-sm">
          <h2 className="font-medium mb-3">Identity</h2>
          {!isEditingProfile ? (
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-start justify-between w-full">
                <div className="text-base font-medium truncate">
                  {profileForm.username || (
                    <span className="text-muted-foreground">Unnamed</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="mr-2 text-sm text-muted-foreground hover:text-foreground focus:outline-none relative z-10"
                  aria-label="Edit profile"
                >
                  Edit
                </button>
              </div>
              <div className="w-full">
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {profileForm.subject.length > 0 ? (
                    profileForm.subject.map((subj) => (
                      <Badge key={subj} variant="secondary">
                        {subj}
                      </Badge>
                    ))
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-muted-foreground"
                    >
                      No subjects
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {profileForm.school || "No school"}
                  </Badge>
                </div>
                <div className="mt-7 text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>Email</span>
                    <span className="text-foreground truncate max-w-[100%]">
                      {user?.email ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Member since</span>
                    <span className="text-foreground">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-4 max-w-md" onSubmit={onProfileSubmit}>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(e) => onProfileChange("username", e.target.value)}
                  placeholder="e.g. kay"
                  disabled={isProfileFetching}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subjects
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profileForm.subject.map((subj) => (
                    <Badge
                      key={subj}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {subj}
                      <button
                        type="button"
                        onClick={() => removeSubject(subj)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label={`Remove ${subj}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-3 h-3"
                        >
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="subject"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={handleSubjectInputKeyDown}
                    placeholder="e.g. Physics"
                    disabled={isProfileFetching}
                  />
                  <button
                    type="button"
                    onClick={addSubject}
                    disabled={isProfileFetching || !subjectInput.trim()}
                    className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter or click Add to add a subject tag
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="school" className="text-sm font-medium">
                  School
                </label>
                <Input
                  id="school"
                  value={profileForm.school}
                  onChange={(e) => onProfileChange("school", e.target.value)}
                  placeholder="e.g. MIT"
                  disabled={isProfileFetching}
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isProfileSaving || isProfileFetching}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {isProfileSaving ? "Saving…" : "Save"}
                </button>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={isProfileSaving}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="md:col-span-2 grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reputation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div className="text-3xl font-semibold">{reputation}</div>
                <div className="w-full h-16">
                  {reputationSeries.length > 0 ? (
                    <svg
                      viewBox="0 0 100 30"
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >
                      {(() => {
                        const values = reputationSeries.map((p) => p.value);
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const spread = max - min || 1;
                        const pts = reputationSeries.map((p, i) => {
                          const x =
                            (i / (reputationSeries.length - 1 || 1)) * 100;
                          const y = 30 - ((p.value - min) / spread) * 28 - 1; // top/bottom padding
                          return `${x},${y}`;
                        });
                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="1.5"
                              points={pts.join(" ")}
                            />
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    <div className="text-xs text-muted-foreground h-full flex items-center justify-end">
                      No data
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Reputation = sum of weights of your published contributions over
                time.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Build last 12 weeks grid (7 x 12 columns)
                const today = new Date();
                const start = new Date(today);
                start.setDate(start.getDate() - 7 * 12 + 1);
                // Build array of dates
                const dates: Date[] = [];
                for (let i = 0; i < 7 * 12; i++) {
                  const d = new Date(start);
                  d.setDate(start.getDate() + i);
                  dates.push(d);
                }
                const maxCount = Math.max(
                  0,
                  ...dates.map(
                    (d) =>
                      activity[
                        new Date(d.getFullYear(), d.getMonth(), d.getDate())
                          .toISOString()
                          .slice(0, 10)
                      ] || 0
                  )
                );
                function level(count: number) {
                  if (!count) return 0;
                  if (maxCount <= 1) return 1;
                  const ratio = count / maxCount;
                  if (ratio > 0.75) return 4;
                  if (ratio > 0.5) return 3;
                  if (ratio > 0.25) return 2;
                  return 1;
                }
                return (
                  <div className="flex gap-1 overflow-x-auto">
                    {Array.from({ length: 12 }).map((_, col) => (
                      <div key={col} className="grid grid-rows-7 gap-1">
                        {Array.from({ length: 7 }).map((__, row) => {
                          const idx = col * 7 + row;
                          const d = dates[idx];
                          const key = new Date(
                            d.getFullYear(),
                            d.getMonth(),
                            d.getDate()
                          )
                            .toISOString()
                            .slice(0, 10);
                          const count = activity[key] || 0;
                          const lvl = level(count);
                          const colors = [
                            "bg-muted",
                            "bg-emerald-200 dark:bg-emerald-900/60",
                            "bg-emerald-300 dark:bg-emerald-800/60",
                            "bg-emerald-400 dark:bg-emerald-700/60",
                            "bg-emerald-500 dark:bg-emerald-600/60",
                          ];
                          return (
                            <div
                              key={row}
                              className={`size-3 rounded-sm ${colors[lvl]}`}
                              title={`${key}: ${count} contributions`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="text-xs text-muted-foreground mt-2">
                Past 12 weeks of activity
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <h2 className="text-xl font-medium">My Contributions</h2>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {hasError && <p className="text-sm text-red-600">{hasError}</p>}
      {!isLoading && !hasError && (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1 rounded-md bg-muted p-1">
            {(
              [
                {
                  key: "sources",
                  label: "Sources",
                  count: sourceCards.length,
                },
                {
                  key: "published",
                  label: "Published",
                  count: data?.published.length ?? 0,
                },
                {
                  key: "drafts",
                  label: "Drafts",
                  count: Array.isArray(data?.draft) ? data.draft.length : 0,
                },
                {
                  key: "comments",
                  label: "Comments",
                  count: Array.isArray(data?.comments)
                    ? data.comments.length
                    : 0,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setContribTab(tab.key)}
                className={`px-3 py-1.5 text-sm rounded ${
                  contribTab === tab.key
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>

          {contribTab === "sources" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Sources you have contributed to.
                </p>
                <Link href="/sources/new">
                  <Button variant="outline" size="sm">
                    New source
                  </Button>
                </Link>
              </div>
              {sourceCards.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No sources yet. Upload a definition or add a source metadata
                  entry to get started.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sourceCards.map((card) => {
                    const meta = sourceMetadata[card.title];
                    const metaLine = [
                      meta?.author,
                      meta?.year,
                      meta?.publisher,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const encodedTitle = encodeURIComponent(card.title);

                    return (
                      <Card key={card.title} className="flex h-full flex-col">
                        <CardHeader className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {meta?.cover_url && (
                                <img
                                  src={meta.cover_url}
                                  alt="Cover"
                                  className="h-14 w-10 rounded border object-cover flex-shrink-0"
                                  onError={(e) => {
                                    (
                                      e.currentTarget as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              )}
                              <CardTitle className="text-base min-w-0">
                                <Link
                                  href={`/sources/${encodedTitle}`}
                                  className="hover:underline break-words"
                                >
                                  {card.title}
                                </Link>
                              </CardTitle>
                            </div>
                            <Badge variant="secondary">{card.count}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {metaLine ||
                              (isSourceMetaLoading
                                ? "Loading metadata..."
                                : "No metadata yet")}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {card.latestTerm ? `${card.latestTerm}: ` : ""}
                            {card.preview}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Updated{" "}
                              {new Date(
                                card.latestUpdatedAt
                              ).toLocaleDateString()}
                            </span>
                            <Link
                              href={`/sources/${encodedTitle}`}
                              className="hover:underline"
                            >
                              View source
                            </Link>
                          </div>
                          <Link
                            href={
                              meta?.id
                                ? `/sources/new?id=${encodeURIComponent(meta.id)}`
                                : `/sources/new?title=${encodedTitle}`
                            }
                            className="text-xs text-muted-foreground underline"
                          >
                            {meta ? "Edit metadata" : "Add metadata"}
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {contribTab === "published" && (
                <>
                  {data && data.published.length > 0 ? (
                    data.published.map((item) => (
                      <li key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm">{item.text}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              {item.slug && (
                                <Link
                                  href={`/term/${item.slug}`}
                                  className="hover:underline"
                                >
                                  View term
                                </Link>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditContribution(item)}
                              className="text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                              title="Edit contribution"
                            >
                              Edit
                            </button>
                            <span className="text-muted-foreground">•</span>
                            <button
                              onClick={() => handleDeleteContribution(item)}
                              className="text-sm text-red-600 hover:text-red-700 focus:outline-none"
                              title="Delete contribution"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-3 text-sm text-muted-foreground">
                      No published items
                    </li>
                  )}
                </>
              )}

              {contribTab === "drafts" && (
                <>
                  {data && Array.isArray(data.draft) && data.draft.length > 0 ? (
                    data.draft.map((item) => (
                      <li key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm">{item.text}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditContribution(item)}
                              className="text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                              title="Edit contribution"
                            >
                              Edit
                            </button>
                            <span className="text-muted-foreground">•</span>
                            <button
                              onClick={() => handleDeleteContribution(item)}
                              className="text-sm text-red-600 hover:text-red-700 focus:outline-none"
                              title="Delete contribution"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-3 text-sm text-muted-foreground">
                      No drafts
                    </li>
                  )}
                </>
              )}

              {contribTab === "comments" && (
                <>
                  {data &&
                  Array.isArray(data.comments) &&
                  data.comments.length > 0 ? (
                    data.comments.map((c) => (
                      <li key={c.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm">{c.body}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              {c.slug && (
                                <Link
                                  href={`/term/${c.slug}`}
                                  className="hover:underline"
                                >
                                  View term
                                </Link>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-3 text-sm text-muted-foreground">
                      No comments
                    </li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      )}

      <EditContributionDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        contribution={editingContribution}
        onSave={handleSaveContribution}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Contribution"
        description="Are you sure you want to delete this contribution? This will permanently remove it from the platform."
        itemName={
          deletingContribution?.text?.slice(0, 100) +
          (deletingContribution?.text && deletingContribution.text.length > 100
            ? "..."
            : "")
        }
        isDeleting={isDeleting}
      />
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
