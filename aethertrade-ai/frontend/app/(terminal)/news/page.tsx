import type { Metadata } from "next";

import { ModulePage } from "@/components/shared/module-page";

export const metadata: Metadata = { title: "News & Events" };

export default function NewsPage() {
  return <ModulePage id="news" />;
}
