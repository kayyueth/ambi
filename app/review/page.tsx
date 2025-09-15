"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Card {
  id: string;
  text: string;
}

export default function ReviewPage() {
  const [cards, setCards] = useState<Card[]>([
    { id: "1", text: "Definition candidate A" },
    { id: "2", text: "Definition candidate B" },
    { id: "3", text: "Definition candidate C" },
  ]);

  function vote(direction: "down" | "up") {
    setCards(prev => prev.slice(1));
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
            <Button variant="secondary" onClick={() => vote("down")}>👈 Lower</Button>
            <Button onClick={() => vote("up")}>👉 Raise</Button>
            <Button variant="destructive" className="ml-auto">Hold to flag</Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">No more cards.</p>
      )}
    </div>
  );
}


