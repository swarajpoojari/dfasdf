"use client";

import { Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { usePreferences, useSession } from "@/hooks/use-session";

import { BrandMark } from "./brand";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { StatusBar } from "./status-bar";
import { TopBar } from "./top-bar";

/** Applies the theme preference to <html data-theme>. Dark is the default before preferences load. */
function ThemeSync() {
  const { data } = usePreferences();
  const theme = data?.theme ?? "dark";
  useEffect(() => {
    const root = document.documentElement;
    if (theme !== "system") {
      root.dataset.theme = theme;
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      root.dataset.theme = media.matches ? "light" : "dark";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();

  if (session.isPending || session.isError) {
    // isError → the global query error handler redirects to /login (or shows the cause below).
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <BrandMark className="size-8" />
        {session.isError ? (
          <p role="alert">Could not load your session: {session.error.message}</p>
        ) : (
          <p className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading session…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ThemeSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</main>
        <StatusBar />
      </div>
      <CommandPalette />
    </div>
  );
}
