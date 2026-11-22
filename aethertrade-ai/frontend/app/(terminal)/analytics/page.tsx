import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Performance Analytics" };

export default function AnalyticsPage() {
  return <ModulePage id="analytics" />;
}
