import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "AI Intelligence Center" };

export default function IntelligencePage() {
  return <ModulePage id="intelligence" />;
}
