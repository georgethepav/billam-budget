import { unstable_cache, updateTag } from "next/cache";

// All household read data shares one cache tag. The app is single-household
// and mutations are infrequent (CSV import, occasional edits), so on any
// change we bust the whole derived cache - simple and always correct. The
// revalidate window is a safety net if a mutation ever forgets to invalidate.
export const HOUSEHOLD_TAG = "household";
const REVALIDATE_SECONDS = 300;

// The Data Cache persists across deployments, and the cache key does NOT
// reflect helper logic (e.g. week boundaries) used inside a cached query.
// So when derivation logic changes, a deploy alone won't refresh cached
// values. Bump this whenever query/calculation logic changes to bust every
// cached entry on the next deploy.
//   v3: week changed to Tuesday->Monday
const CACHE_VERSION = "v3";

// Wrap a DB read so its result is cached across requests/navigations and
// served from Next's Data Cache instead of hitting Neon every time. Arguments
// are part of the cache key automatically.
export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[]
): (...args: A) => Promise<R> {
  return unstable_cache(fn, [CACHE_VERSION, ...keyParts], {
    tags: [HOUSEHOLD_TAG],
    revalidate: REVALIDATE_SECONDS,
  });
}

// Call from every mutating server action so navigations show fresh data.
// updateTag gives read-your-own-writes: the next page render waits for fresh
// data rather than serving stale (correct for financial figures). It is only
// valid inside Server Actions, which is the only place this is called.
export function revalidateHousehold(): void {
  updateTag(HOUSEHOLD_TAG);
}
