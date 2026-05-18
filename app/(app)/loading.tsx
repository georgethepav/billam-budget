import { Loader2 } from "lucide-react";

// Shared fallback for every page in the (app) group. These routes are
// force-dynamic (per-request DB reads) and aren't prefetched, so without a
// loading boundary a client navigation leaves the old page on screen until
// the server responds - on mobile the menu just closes and nothing seems to
// happen. This shows instantly on tap and covers the content area while the
// destination renders.
export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="absolute inset-0 z-20 flex min-h-[50vh] items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card/80 px-6 py-5 text-sm text-muted-foreground ring-1 ring-foreground/10">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
        Loading…
      </div>
    </div>
  );
}
