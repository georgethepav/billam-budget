import { requireAuth } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/nav";

// Every page in this segment is per-request: it reads the session cookie and
// live transaction data, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="relative flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
