import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Indian Market Explorer" };

export default function IndiaPage() {
  return <ModulePage id="india" />;
}
