import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Global Markets" };

export default function MarketsPage() {
  return <ModulePage id="markets" />;
}
