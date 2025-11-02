"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

interface Card {
  id: string;
  text: string;
  term: string;
  source: string;
  slug: string;
}

export default function ReviewPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState<string>("");
  const [flagNotes, setFlagNotes] = useState<string>("");
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Define fetchReviewCard using useCallback to avoid dependency issues
  const fetchReviewCard = useCallback(
    async (source: string | null): Promise<Card | null> => {
      try {
        const url = source
          ? `/api/review?source=${encodeURIComponent(source)}`
          : "/api/review";
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.card;
      } catch (error) {
        console.error("Failed to fetch review card:", error);
        return null;
      }
    },
    []
  );

  // Load sources on mount
  useEffect(() => {
    async function loadSources() {
      setIsLoadingSources(true);
      try {
        const res = await fetch("/api/review/sources");
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || []);
        }
      } catch (error) {
        console.error("Failed to load sources:", error);
      } finally {
        setIsLoadingSources(false);
      }
    }
    loadSources();
  }, []);

  // Initialize cards on client side only to prevent hydration mismatch
  useEffect(() => {
    async function loadInitialCards() {
      if (isInitialized) return;
      const cardPromises = [
        fetchReviewCard(null),
        fetchReviewCard(null),
        fetchReviewCard(null),
      ];
      const initialCards = await Promise.all(cardPromises);
      setCards(initialCards.filter((card): card is Card => card !== null));
      setIsInitialized(true);
    }
    loadInitialCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload cards when source filter changes
  useEffect(() => {
    if (!isInitialized) return;
    async function reloadCards() {
      const cardPromises = [
        fetchReviewCard(selectedSource),
        fetchReviewCard(selectedSource),
        fetchReviewCard(selectedSource),
      ];
      const newCards = await Promise.all(cardPromises);
      setCards(newCards.filter((card): card is Card => card !== null));
    }
    reloadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, isInitialized]);

  const vote = useCallback(
    (direction: "down" | "up") => {
      setCards((prev) => {
        const rest = prev.slice(1);
        fetchReviewCard(selectedSource).then((newCard) => {
          if (newCard) {
            setCards((currentCards) => [...currentCards, newCard]);
          }
        });
        return rest;
      });
      console.log("vote", direction);
    },
    [fetchReviewCard, selectedSource]
  );

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

  const skip = useCallback(() => {
    setCards((prev) => {
      const rest = prev.slice(1);
      fetchReviewCard(selectedSource).then((newCard) => {
        if (newCard) {
          setCards((currentCards) => [...currentCards, newCard]);
        }
      });
      return rest;
    });
    console.log("skip");
  }, [fetchReviewCard, selectedSource]);

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
  }, [holdTimer, isHolding, vote, skip]);

  const current = cards[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Review</h1>
          <p className="text-sm text-muted-foreground">
            Use ← → to vote, Space (hold) to flag, ↑ to skip. You can also click
            left/right sides of the card.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isLoadingSources}>
              {selectedSource ? `Source: ${selectedSource}` : "All Sources"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[400px] overflow-y-auto"
          >
            <DropdownMenuItem
              onClick={() => setSelectedSource(null)}
              className={!selectedSource ? "bg-accent" : ""}
            >
              All Sources
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {sources.map((source) => (
              <DropdownMenuItem
                key={source}
                onClick={() => setSelectedSource(source)}
                className={selectedSource === source ? "bg-accent" : ""}
              >
                {source}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
            className="relative rounded-lg border bg-card p-8 min-h-[280px] flex flex-col cursor-pointer select-none transition-all duration-200 hover:shadow-lg hover:border-ring/50"
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
              <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent rounded-lg pointer-events-none" />
            )}

            {/* Right side gradient overlay */}
            {hoveredSide === "right" && (
              <div className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent rounded-lg pointer-events-none" />
            )}

            {/* Hold indicator */}
            {isHolding && (
              <div className="absolute inset-0 bg-muted/40 rounded-lg pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col h-full">
              {/* Term as title */}
              <div className="mb-4 pb-3 border-b">
                <h2 className="text-2xl font-bold text-foreground">
                  {current.term}
                </h2>
              </div>

              {/* Definition */}
              <div className="flex-1 flex items-start">
                <p className="text-base leading-relaxed text-foreground">
                  {current.text}
                </p>
              </div>

              {/* Footer with source and link */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Source:</span>{" "}
                  <span className="italic">{current.source}</span>
                </div>
                <div>
                  <Link
                    href={`/term/${current.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1.5 font-medium transition-colors"
                  >
                    View term details
                    <span className="text-xs">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {/* Below-card labels */}
          <div className="flex items-center justify-between gap-4 px-2">
            <div
              className={`flex-1 px-4 py-2.5 rounded-md border bg-muted/50 text-sm font-medium transition-all ${
                hoveredSide === "left"
                  ? "opacity-100 border-destructive/30 bg-destructive/5 text-destructive"
                  : "opacity-50 text-muted-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>←</span>
                <span>Lower</span>
              </span>
            </div>
            <div
              className={`flex-1 px-4 py-2.5 rounded-md border bg-muted/50 text-sm font-medium transition-all ${
                hoveredSide === "right"
                  ? "opacity-100 border-primary/30 bg-primary/5 text-primary"
                  : "opacity-50 text-muted-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>Raise</span>
                <span>→</span>
              </span>
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
