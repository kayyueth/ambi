import Link from "next/link";

interface PageProps {
  params: { slug: string };
}

export default function TermDetailPage(props: PageProps) {
  const { slug } = props.params;
  const decoded = decodeURIComponent(slug);
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold">{decoded}</h1>
        <Link
          className="underline"
          href={`/upload?term=${encodeURIComponent(decoded)}`}
        >
          Upload definition
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Candidate definitions</h2>
        <div className="space-y-3">
          <DefinitionCard
            text="An example candidate definition for demonstration."
            source="Example Source"
          />
          <DefinitionCard
            text="Another candidate definition variant."
            source="Another Source"
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">History & provenance</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground">
          <li>v1 by userA — 2025-09-01</li>
          <li>v2 by userB — 2025-09-10</li>
        </ul>
      </section>
    </div>
  );
}

function DefinitionCard({ text, source }: { text: string; source: string }) {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <p>{text}</p>
      <p className="text-xs text-muted-foreground">Source: {source}</p>
    </div>
  );
}
