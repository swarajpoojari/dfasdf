import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Research Reports" };

export default function ReportsPage() {
  return <ModulePage id="reports" />;
}
