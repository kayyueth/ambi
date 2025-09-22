"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { nextReviewCard } from "@/lib/mock-data";
import { Textarea } from "@/components/ui/textarea";

interface Card {
  id: string;
  text: string;
  term: string;
}

export default function ReviewPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState<string>("");
  const [flagNotes, setFlagNotes] = useState<string>("");
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize cards on client side only to prevent hydration mismatch
  useEffect(() => {
    if (!isInitialized) {
      const first = nextReviewCard();
      const second = nextReviewCard();
      const third = nextReviewCard();
      const initialCards = [first, second, third]
        .filter(Boolean)
        .map((x, i) => ({
          id: `${x!.candidate.id}-${i}`,
          text: `${x!.candidate.text} — ${x!.term.term}`,
          term: x!.term.slug,
        }));
      setCards(initialCards);
      setIsInitialized(true);
    }
  }, [isInitialized]);

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

  function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
    if (isHolding) return; // Prevent voting when holding

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = event.clientX - rect.left;
    const cardWidth = rect.width;

    if (clickX < cardWidth / 2) {
      vote("down");
    } else {
      vote("up");
    }
  }

  function handleCardHover(event: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const hoverX = event.clientX - rect.left;
    const cardWidth = rect.width;

    if (hoverX < cardWidth / 2) {
      setHoveredSide("left");
    } else {
      setHoveredSide("right");
    }
  }

  function handleCardLeave() {
    setHoveredSide(null);
  }

  function handleMouseDown() {
    setIsHolding(true);
    const timer = setTimeout(() => {
      setShowFlagDialog(true);
    }, 1000); // 1 second hold
    setHoldTimer(timer);
  }

  function handleMouseUp() {
    setIsHolding(false);
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  }

  function skip() {
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
    console.log("skip");
  }

  function handleFlagConfirm() {
    setShowFlagDialog(false);
    console.log("flagged", {
      reason: flagReason,
      notes: flagNotes,
      cardId: cards[0]?.id,
    });
    // Add flag logic here
  }

  function handleFlagCancel() {
    setShowFlagDialog(false);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        vote("down");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        vote("up");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        skip();
      } else if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (isHolding) return;
        setIsHolding(true);
        const timer = setTimeout(() => {
          setShowFlagDialog(true);
        }, 1000);
        setHoldTimer(timer);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space" || event.key === " ") {
        setIsHolding(false);
        if (holdTimer) {
          clearTimeout(holdTimer);
        }
        setHoldTimer(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [holdTimer, isHolding]);

  const current = cards[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Review</h1>
      <p className="text-sm text-muted-foreground">
        Use ← → to vote, Space (hold) to flag, ↑ to skip. You can also click
        left/right sides of the card.
      </p>
      {!isInitialized ? (
        <div className="space-y-4">
          <div className="rounded-lg border p-6 min-h-40 flex items-center justify-center text-lg">
            <div className="text-muted-foreground">Loading cards...</div>
          </div>
        </div>
      ) : current ? (
        <div className="space-y-4">
          <div
            ref={cardRef}
            className="relative rounded-lg border p-6 min-h-40 flex items-center text-lg cursor-pointer select-none transition-all duration-200 hover:shadow-lg"
            onClick={handleCardClick}
            onMouseMove={handleCardHover}
            onMouseLeave={() => {
              handleCardLeave();
              handleMouseUp();
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {/* Left side gradient overlay */}
            {hoveredSide === "left" && (
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent dark:from-white/10 rounded-lg pointer-events-none" />
            )}

            {/* Right side gradient overlay */}
            {hoveredSide === "right" && (
              <div className="absolute inset-0 bg-gradient-to-l from-black/10 to-transparent dark:from-white/10 rounded-lg pointer-events-none" />
            )}

            {/* Hold indicator */}
            {isHolding && (
              <div className="absolute inset-0 bg-gray-500/20 rounded-lg pointer-events-none" />
            )}

            <span className="relative z-10">{current.text}</span>
          </div>
          {/* Below-card labels */}
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <div
              className={`px-2 py-1 rounded-full border bg-background shadow-sm transition-opacity ${
                hoveredSide === "left" ? "opacity-100" : "opacity-60"
              }`}
            >
              ← Lower
            </div>
            <div
              className={`px-2 py-1 rounded-full border bg-background shadow-sm transition-opacity ${
                hoveredSide === "right" ? "opacity-100" : "opacity-60"
              }`}
            >
              Raise →
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">No more cards.</p>
      )}

      {/* Flag confirmation dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Content</DialogTitle>
            <DialogDescription>
              Select a reason and optionally add notes. This will be recorded
              for moderator review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {[
                "Factual error",
                "Misdefined scope",
                "Unreliable source",
                "Plagiarism / infringement",
                "Outdated information",
                "Language issues (ambiguous / mistranslated)",
                "Other (notes)",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setFlagReason(reason)}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                    flagReason === reason
                      ? "border-ring bg-ring/10"
                      : "hover:bg-muted"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Add notes (optional)"
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleFlagCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlagConfirm}
              disabled={!flagReason}
            >
              Flag Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
