import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "Backtesting" };

export default function BacktestingPage() {
  return <ModulePage id="backtesting" />;
}
