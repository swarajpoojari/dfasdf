import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Forex" };

export default function ForexPage() {
  return <ModulePage id="forex" />;
}
