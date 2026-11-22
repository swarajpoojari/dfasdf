import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Cryptocurrency" };

export default function CryptoPage() {
  return <ModulePage id="crypto" />;
}
