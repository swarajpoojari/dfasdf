"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/primitives";
import { MODULES, NAV_GROUPS, moduleForPath, type ModuleDefinition } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { BrandMark, BrandName } from "./brand";

function StatusTag({ module }: { module: ModuleDefinition }) {
  if (module.status === "available") return null;
  if (module.status === "partial") {
    return (
      <span
        className="ml-auto size-1.5 shrink-0 rounded-full bg-warning"
        aria-label="Partially implemented"
        title="Partially implemented"
      />
    );
  }
  return (
    <span
      className="ml-auto shrink-0 font-mono text-2xs text-subtle-foreground"
      title={`Planned for Phase ${module.phase}`}
    >
      P{module.phase}
    </span>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = moduleForPath(pathname);

  return (
    <nav aria-label="Modules" className="flex flex-col gap-4 px-2 py-3">
      {NAV_GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group);
        return (
          <div key={group} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="mx-2 mb-1 h-px bg-border" />
            ) : (
              <p className="px-2 pb-1 text-2xs font-semibold tracking-widest text-subtle-foreground uppercase">
                {group}
              </p>
            )}
            {items.map((item) => {
              const isActive = active?.id === item.id;
              const Icon = item.icon;
              const link = (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
                    isActive && "bg-surface-2 text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {isActive ? (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden />
                  ) : null}
                  <Icon className={cn("size-4 shrink-0", isActive && "text-accent")} aria-hidden />
                  {collapsed ? (
                    <span className="sr-only">{item.title}</span>
                  ) : (
                    <>
                      <span className="truncate">{item.shortTitle ?? item.title}</span>
                      <StatusTag module={item} />
                    </>
                  )}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.id} content={item.title}>
                  {link}
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className={cn("flex h-11 items-center gap-2 border-b px-3", collapsed && "justify-center px-0")}>
        <BrandMark />
        {collapsed ? null : <BrandName />}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <SidebarNav collapsed={collapsed} />
      </div>
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 items-center gap-2 border-t px-3 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="mx-auto size-4" />
        ) : (
          <>
            <PanelLeftClose className="size-4" /> Collapse
          </>
        )}
      </button>
    </aside>
  );
}
