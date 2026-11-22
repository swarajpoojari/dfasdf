"use client";

import { LogOut, Menu, Search, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
  SheetContent,
} from "@/components/ui/primitives";
import { useLogout, useSession } from "@/hooks/use-session";
import { moduleForPath } from "@/lib/navigation";
import { useUiStore } from "@/stores/ui-store";

import { BrandMark, BrandName } from "./brand";
import { SidebarNav } from "./sidebar";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <SheetContent title="Navigation" aria-describedby={undefined}>
        <div className="flex h-11 items-center gap-2 border-b px-3">
          <BrandMark />
          <BrandName />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Dialog>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const current = moduleForPath(pathname);
  const setPalette = useUiStore((s) => s.setCommandPaletteOpen);
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-surface px-2 sm:px-3">
      <MobileNav />
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden text-xs text-subtle-foreground sm:inline">{current?.group}</span>
        <span className="hidden text-subtle-foreground sm:inline" aria-hidden>
          /
        </span>
        <h1 className="truncate text-sm font-medium">{current?.title ?? "AetherTrade"}</h1>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="hidden h-7 w-56 items-center gap-2 rounded-md border border-border-strong bg-background px-2 text-xs text-subtle-foreground hover:border-accent/50 md:flex"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="flex-1 text-left">Jump to module…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search modules" onClick={() => setPalette(true)}>
          <Search />
        </Button>

        <Badge tone="accent" title="Research and paper trading only. No real orders can be placed.">
          <ShieldCheck aria-hidden />
          <span className="hidden sm:inline">Paper only</span>
          <span className="sm:hidden">Paper</span>
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex size-7 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-2xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {user ? initials(user.display_name) || "·" : "·"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{user?.display_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {user ? (
                <Badge className="mt-1.5" tone="neutral">
                  {user.role}
                </Badge>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
