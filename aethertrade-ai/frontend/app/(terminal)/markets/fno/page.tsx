import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Futures & Options" };

export default function FnoPage() {
  return <ModulePage id="fno" />;
}
