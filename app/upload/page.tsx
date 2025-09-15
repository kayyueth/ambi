"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get("term") ?? "");
  const [definition, setDefinition] = useState("");
  const [source, setSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, definition, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }
      setDefinition("");
      setSource("");
      router.push(`/term/${data.slug}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload</h1>
      <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term"
          aria-invalid={!term}
        />
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="Definition"
          className="w-full min-h-40 rounded-md border px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">Min 10 characters.</p>
        <Input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source (optional)"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || !term || definition.trim().length < 10}
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
          <Button type="button" variant="secondary">
            Upload PDF/Image
          </Button>
        </div>
      </form>
    </div>
  );
}
