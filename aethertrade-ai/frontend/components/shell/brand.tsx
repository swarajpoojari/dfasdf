import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6 shrink-0", className)}>
      <rect x="1" y="1" width="22" height="22" rx="5" className="fill-accent-muted stroke-accent/50" strokeWidth="1" />
      <path
        d="M5 16.5 9 11l3 3 3.5-6L19 12"
        fill="none"
        className="stroke-accent"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="12" r="1.4" className="fill-accent" />
    </svg>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("truncate text-sm font-semibold tracking-tight", className)}>
      Aether<span className="text-accent">Trade</span>
      <span className="ml-1 text-2xs font-medium text-subtle-foreground">AI</span>
    </span>
  );
}
