import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Global ETFs" };

export default function EtfsPage() {
  return <ModulePage id="etfs" />;
}
