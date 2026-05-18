"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  ReceiptText,
  Wallet,
  PiggyBank,
  LineChart,
  Landmark,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { logoutAction } from "@/app/actions/auth";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOut() {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-3 px-3 text-muted-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="px-5 py-5">
        <p className="text-sm font-semibold leading-tight">Billam Family</p>
        <p className="text-xs text-muted-foreground">Budget</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <NavLinks />
      </div>
      <div className="border-t p-3">
        <SignOut />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
      <div>
        <p className="text-sm font-semibold leading-tight">Billam Family</p>
        <p className="text-xs text-muted-foreground">Budget</p>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="outline" size="icon" aria-label="Menu" />}
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="px-5 py-5 text-sm font-semibold">
            Billam Family Budget
          </SheetTitle>
          <div className="px-3">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-4 border-t p-3">
            <SignOut />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
