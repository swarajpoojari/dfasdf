import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Strategy Laboratory" };

export default function StrategiesPage() {
  return <ModulePage id="strategies" />;
}
