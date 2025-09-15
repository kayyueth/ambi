"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    alert(`Submitted: ${term} -> ${definition.substring(0, 60)}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload</h1>
      <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
        <Input value={term} onChange={e => setTerm(e.target.value)} placeholder="Term" />
        <textarea
          value={definition}
          onChange={e => setDefinition(e.target.value)}
          placeholder="Definition"
          className="w-full min-h-40 rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <Button type="submit">Submit</Button>
          <Button type="button" variant="secondary">Upload PDF/Image</Button>
        </div>
      </form>
    </div>
  );
}


