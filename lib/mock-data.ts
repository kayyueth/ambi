export interface DefinitionCandidate {
  id: string;
  text: string;
  source: string;
  weight: number;
}

export interface TermEntry {
  slug: string;
  term: string;
  candidates: DefinitionCandidate[];
}

export function toSlug(term: string): string {
  return encodeURIComponent(term.trim().toLowerCase().replace(/\s+/g, "-"));
}

export const TERMS: TermEntry[] = [
  {
    term: "Social Construct",
    slug: toSlug("Social Construct"),
    candidates: [
      {
        id: "sc-1",
        text: "An idea or category whose meaning and significance are produced through social practices rather than inherent natural properties.",
        source: "Intro to Sociology, 5th ed.",
        weight: 0.72,
      },
      {
        id: "sc-2",
        text: "A concept that exists because people agree to act as if it exists, shaping institutions and behavior.",
        source: "Stanford Encyclopedia (paraphrase)",
        weight: 0.64,
      },
    ],
  },
  {
    term: "Habitus",
    slug: toSlug("Habitus"),
    candidates: [
      {
        id: "hb-1",
        text: "Durable, embodied dispositions that guide perception and action, produced by socialization and history.",
        source: "Bourdieu, Outline of a Theory of Practice",
        weight: 0.68,
      },
      {
        id: "hb-2",
        text: "A system of internalized schemes that generate practices consistent with social structures.",
        source: "Sociology glossary",
        weight: 0.59,
      },
    ],
  },
  {
    term: "Discourse",
    slug: toSlug("Discourse"),
    candidates: [
      {
        id: "dc-1",
        text: "Structured ways of talking and thinking that construct objects of knowledge and relations of power.",
        source: "Foucault reader",
        weight: 0.61,
      },
      {
        id: "dc-2",
        text: "Language-in-use within social contexts that shapes meaning and identities.",
        source: "Linguistic anthropology notes",
        weight: 0.53,
      },
    ],
  },
  {
    term: "Rational Choice",
    slug: toSlug("Rational Choice"),
    candidates: [
      {
        id: "rc-1",
        text: "A framework modeling individuals as utility-maximizers under constraints and information.",
        source: "Microeconomics textbook",
        weight: 0.58,
      },
      {
        id: "rc-2",
        text: "An approach explaining social outcomes via preference-driven choices of actors.",
        source: "Analytical sociology overview",
        weight: 0.5,
      },
    ],
  },
  {
    term: "Collective Action Problem",
    slug: toSlug("Collective Action Problem"),
    candidates: [
      {
        id: "cap-1",
        text: "A situation where individually rational behavior leads to suboptimal outcomes for the group.",
        source: "Olson, The Logic of Collective Action",
        weight: 0.66,
      },
      {
        id: "cap-2",
        text: "Difficulty coordinating contributions to public goods due to incentives to free ride.",
        source: "Political economy notes",
        weight: 0.6,
      },
    ],
  },
];

export function findBySlug(slug: string): TermEntry | undefined {
  return TERMS.find((t) => t.slug === slug);
}

export function searchTerms(query: string): TermEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TERMS.filter((t) => t.term.toLowerCase().includes(q));
}

export function nextReviewCard(): {
  term: TermEntry;
  candidate: DefinitionCandidate;
} | null {
  const pool = TERMS.flatMap((t) =>
    t.candidates.map((c) => ({ term: t, candidate: c }))
  );
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
}
