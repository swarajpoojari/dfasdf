import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Paper Portfolio" };

export default function PortfolioPage() {
  return <ModulePage id="portfolio" />;
}
