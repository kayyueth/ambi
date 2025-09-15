export default function ContributionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Contributions</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-md border p-4">
          <h2 className="font-medium mb-2">Drafts</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>No drafts</li>
          </ul>
        </section>
        <section className="rounded-md border p-4">
          <h2 className="font-medium mb-2">Published</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>None</li>
          </ul>
        </section>
        <section className="rounded-md border p-4">
          <h2 className="font-medium mb-2">Pending Review</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>None</li>
          </ul>
        </section>
      </div>
    </div>
  );
}


