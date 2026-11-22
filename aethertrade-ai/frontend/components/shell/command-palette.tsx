"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle, Kbd } from "@/components/ui/primitives";
import { searchModules } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useMemo(() => searchModules(query), [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!useUiStore.getState().commandPaletteOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  function close(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setCursor(0);
    }
  }

  function go(index: number) {
    const target = results[index];
    if (!target) return;
    close(false);
    router.push(target.href);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl overflow-hidden p-0" aria-describedby="command-palette-hint">
        <DialogTitle className="sr-only">Go to module</DialogTitle>
        <DialogDescription id="command-palette-hint" className="sr-only">
          Type to filter modules, use the arrow keys to choose and Enter to open.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(cursor);
              }
            }}
            placeholder="Jump to a module…"
            aria-label="Search modules"
            className="h-11 flex-1 bg-transparent pr-8 text-sm outline-none placeholder:text-subtle-foreground"
          />
        </div>
        <ul role="listbox" aria-label="Modules" className="max-h-[50vh] overflow-y-auto p-1 scrollbar-thin">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No module matches “{query}”.</li>
          ) : (
            results.map((m, i) => {
              const Icon = m.icon;
              return (
                <li key={m.id} role="option" aria-selected={i === cursor}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left",
                      i === cursor ? "bg-surface-2" : "hover:bg-surface-2",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{m.title}</span>
                      <span className="block truncate text-xs text-subtle-foreground">{m.description}</span>
                    </span>
                    <span className="shrink-0 text-2xs text-subtle-foreground uppercase">{m.group}</span>
                    {i === cursor ? <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center gap-3 border-t px-3 py-2 text-2xs text-subtle-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
