import { NextRequest, NextResponse } from "next/server";

type EnrichRequest = {
  title?: string;
  author?: string;
  isbn?: string;
};

type EnrichedSource = {
  title?: string;
  author?: string;
  year?: string;
  publisher?: string;
  isbn?: string;
  coverUrl?: string;
  openLibraryKey?: string;
};

function normalizeOptional(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function extractYear(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/(\d{4})/);
  return match?.[1];
}

function isbnToCoverUrl(isbn: string) {
  const normalized = isbn.replace(/[^0-9Xx]/g, "");
  if (!normalized) return undefined;
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(
    normalized
  )}-L.jpg?default=false`;
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Ambiguity (Open Library enrichment)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Upstream error ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as EnrichRequest;
    const title = normalizeOptional(body.title);
    const author = normalizeOptional(body.author);
    const isbn = normalizeOptional(body.isbn).replace(/[^0-9Xx]/g, "");

    if (!isbn && !title) {
      return NextResponse.json(
        { error: "Provide isbn or title" },
        { status: 400 }
      );
    }

    const enriched: EnrichedSource = {};

    // 1) Prefer ISBN lookup: https://openlibrary.org/isbn/{isbn}.json
    if (isbn) {
      type IsbnResponse = {
        title?: string;
        publish_date?: string;
        publishers?: string[];
        authors?: Array<{ key: string }>;
      };

      const isbnData = await fetchJson<IsbnResponse>(
        `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`
      );

      if (isbnData.title) enriched.title = isbnData.title;
      if (isbnData.publish_date) enriched.year = extractYear(isbnData.publish_date);
      if (Array.isArray(isbnData.publishers) && isbnData.publishers.length > 0) {
        enriched.publisher = isbnData.publishers[0];
      }
      enriched.isbn = isbn;
      enriched.coverUrl = isbnToCoverUrl(isbn);
      enriched.openLibraryKey = `/isbn/${isbn}`;

      const authorKey = isbnData.authors?.[0]?.key;
      if (authorKey) {
        type AuthorResponse = { name?: string };
        const authorData = await fetchJson<AuthorResponse>(
          `https://openlibrary.org${authorKey}.json`
        );
        if (authorData.name) enriched.author = authorData.name;
      }

      return NextResponse.json({ enriched });
    }

    // 2) Fallback to search endpoint:
    // https://openlibrary.org/search.json?title=...&author=...&limit=1
    type SearchResponse = {
      docs?: Array<{
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        publisher?: string[];
        isbn?: string[];
        cover_i?: number;
        key?: string;
      }>;
    };

    const params = new URLSearchParams();
    params.set("title", title);
    if (author) params.set("author", author);
    params.set("limit", "1");

    const searchData = await fetchJson<SearchResponse>(
      `https://openlibrary.org/search.json?${params.toString()}`
    );
    const doc = searchData.docs?.[0];
    if (!doc) {
      return NextResponse.json(
        { error: "No matches found" },
        { status: 404 }
      );
    }

    if (doc.title) enriched.title = doc.title;
    if (Array.isArray(doc.author_name) && doc.author_name.length > 0) {
      enriched.author = doc.author_name[0];
    }
    if (typeof doc.first_publish_year === "number") {
      enriched.year = String(doc.first_publish_year);
    }
    if (Array.isArray(doc.publisher) && doc.publisher.length > 0) {
      enriched.publisher = doc.publisher[0];
    }
    if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
      enriched.isbn = doc.isbn[0]?.replace(/[^0-9Xx]/g, "");
      if (enriched.isbn) enriched.coverUrl = isbnToCoverUrl(enriched.isbn);
    }
    if (!enriched.coverUrl && typeof doc.cover_i === "number") {
      enriched.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`;
    }
    if (doc.key) enriched.openLibraryKey = doc.key;

    return NextResponse.json({ enriched });
  } catch (error) {
    console.error("Sources enrich error:", error);
    return NextResponse.json(
      { error: "Failed to enrich source" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
