"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { nextReviewCard } from "@/lib/mock-data";

interface Card {
  id: string;
  text: string;
  term: string;
}

export default function ReviewPage() {
  const [cards, setCards] = useState<Card[]>(() => {
    const first = nextReviewCard();
    const second = nextReviewCard();
    const third = nextReviewCard();
    return [first, second, third].filter(Boolean).map((x, i) => ({
      id: `${x!.candidate.id}-${i}`,
      text: `${x!.candidate.text} — ${x!.term.term}`,
      term: x!.term.slug,
    }));
  });

  function vote(direction: "down" | "up") {
    setCards((prev) => {
      const rest = prev.slice(1);
      const refill = nextReviewCard();
      if (refill) {
        rest.push({
          id: `${refill.candidate.id}-${Date.now()}`,
          text: `${refill.candidate.text} — ${refill.term.term}`,
          term: refill.term.slug,
        });
      }
      return rest;
    });
    console.log("vote", direction);
  }

  const current = cards[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Review</h1>
      {current ? (
        <div className="space-y-4">
          <div className="rounded-lg border p-6 min-h-40 flex items-center text-lg">
            {current.text}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => vote("down")}>
              👈 Lower
            </Button>
            <Button onClick={() => vote("up")}>👉 Raise</Button>
            <Button variant="destructive" className="ml-auto">
              Hold to flag
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">No more cards.</p>
      )}
    </div>
  );
}
