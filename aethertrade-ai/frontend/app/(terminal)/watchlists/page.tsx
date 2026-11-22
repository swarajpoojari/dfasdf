import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Watchlists" };

export default function WatchlistsPage() {
  return <ModulePage id="watchlists" />;
}
