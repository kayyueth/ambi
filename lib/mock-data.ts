export interface DefinitionCandidate {
  id: string;
  text: string;
  source: string;
  weight: number;
  userId?: string;
  status: "draft" | "pending" | "published" | "rejected";
  createdAt: string;
  updatedAt: string;
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
        userId: "demo-user-1",
        status: "published",
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-15T10:30:00Z",
      },
      {
        id: "sc-2",
        text: "A concept that exists because people agree to act as if it exists, shaping institutions and behavior.",
        source: "Stanford Encyclopedia (paraphrase)",
        weight: 0.64,
        userId: "demo-user-2",
        status: "published",
        createdAt: "2024-01-20T14:15:00Z",
        updatedAt: "2024-01-20T14:15:00Z",
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
        userId: "demo-user-1",
        status: "published",
        createdAt: "2024-01-10T09:45:00Z",
        updatedAt: "2024-01-10T09:45:00Z",
      },
      {
        id: "hb-2",
        text: "A system of internalized schemes that generate practices consistent with social structures.",
        source: "Sociology glossary",
        weight: 0.59,
        userId: "demo-user-3",
        status: "pending",
        createdAt: "2024-01-25T16:20:00Z",
        updatedAt: "2024-01-25T16:20:00Z",
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
        userId: "demo-user-2",
        status: "published",
        createdAt: "2024-01-12T11:30:00Z",
        updatedAt: "2024-01-12T11:30:00Z",
      },
      {
        id: "dc-2",
        text: "Language-in-use within social contexts that shapes meaning and identities.",
        source: "Linguistic anthropology notes",
        weight: 0.53,
        userId: "demo-user-1",
        status: "draft",
        createdAt: "2024-01-28T08:15:00Z",
        updatedAt: "2024-01-28T08:15:00Z",
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
        userId: "demo-user-3",
        status: "published",
        createdAt: "2024-01-18T13:45:00Z",
        updatedAt: "2024-01-18T13:45:00Z",
      },
      {
        id: "rc-2",
        text: "An approach explaining social outcomes via preference-driven choices of actors.",
        source: "Analytical sociology overview",
        weight: 0.5,
        userId: "demo-user-2",
        status: "rejected",
        createdAt: "2024-01-22T10:20:00Z",
        updatedAt: "2024-01-22T10:20:00Z",
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
        userId: "demo-user-1",
        status: "published",
        createdAt: "2024-01-05T15:30:00Z",
        updatedAt: "2024-01-05T15:30:00Z",
      },
      {
        id: "cap-2",
        text: "Difficulty coordinating contributions to public goods due to incentives to free ride.",
        source: "Political economy notes",
        weight: 0.6,
        userId: "demo-user-3",
        status: "published",
        createdAt: "2024-01-08T12:10:00Z",
        updatedAt: "2024-01-08T12:10:00Z",
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

// User contributions management
export function getUserContributions(userId: string): {
  drafts: DefinitionCandidate[];
  pending: DefinitionCandidate[];
  published: DefinitionCandidate[];
  rejected: DefinitionCandidate[];
} {
  const allContributions: DefinitionCandidate[] = [];

  TERMS.forEach((term) => {
    term.candidates.forEach((candidate) => {
      if (candidate.userId === userId) {
        allContributions.push(candidate);
      }
    });
  });

  return {
    drafts: allContributions.filter((c) => c.status === "draft"),
    pending: allContributions.filter((c) => c.status === "pending"),
    published: allContributions.filter((c) => c.status === "published"),
    rejected: allContributions.filter((c) => c.status === "rejected"),
  };
}

export function updateContributionStatus(
  candidateId: string,
  newStatus: DefinitionCandidate["status"]
): boolean {
  for (const term of TERMS) {
    const candidate = term.candidates.find((c) => c.id === candidateId);
    if (candidate) {
      candidate.status = newStatus;
      candidate.updatedAt = new Date().toISOString();
      return true;
    }
  }
  return false;
}

export function deleteContribution(candidateId: string): boolean {
  for (const term of TERMS) {
    const candidateIndex = term.candidates.findIndex(
      (c) => c.id === candidateId
    );
    if (candidateIndex !== -1) {
      term.candidates.splice(candidateIndex, 1);
      return true;
    }
  }
  return false;
}

export function findContributionById(candidateId: string): {
  term: TermEntry;
  candidate: DefinitionCandidate;
} | null {
  for (const term of TERMS) {
    const candidate = term.candidates.find((c) => c.id === candidateId);
    if (candidate) {
      return { term, candidate };
    }
  }
  return null;
}
