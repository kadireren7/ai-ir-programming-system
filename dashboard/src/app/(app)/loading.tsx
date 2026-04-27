/** Shown during route transitions in the authenticated app shell. */
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted/50" />
      <div className="h-40 animate-pulse rounded-xl bg-muted/30" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-lg bg-muted/25" />
        <div className="h-24 animate-pulse rounded-lg bg-muted/25" />
      </div>
    </div>
  );
}
