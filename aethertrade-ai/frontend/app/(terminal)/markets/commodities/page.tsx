import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Commodities" };

export default function CommoditiesPage() {
  return <ModulePage id="commodities" />;
}
