import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="figures text-sm text-subtle-foreground">404</p>
      <h1 className="text-base font-semibold">This page does not exist</h1>
      <Link href="/dashboard" className="text-sm text-accent hover:underline">
        Back to the overview
      </Link>
    </main>
  );
}
