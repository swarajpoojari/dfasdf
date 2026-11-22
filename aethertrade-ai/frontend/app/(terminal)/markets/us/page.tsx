import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "US Equities" };

export default function UsEquitiesPage() {
  return <ModulePage id="us" />;
}
