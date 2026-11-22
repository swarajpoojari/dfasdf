import * as React from "react";

import { cn } from "@/lib/utils";

/** The terminal's card: a bordered surface with a compact header row. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn("flex min-w-0 flex-col rounded-lg border bg-surface", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-h-10 items-center gap-3 border-b px-3 py-2", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-xs text-subtle-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-w-0 flex-1 p-3", className)} {...props} />;
}
