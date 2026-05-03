"use client";

import { PageTransition } from "@/components/layout/PageTransition";
import Reports from "@/components/dashboards/design/Reports";

export default function ReportsDesignPage() {
  return (
    <PageTransition>
      <div className="p-4 md:p-6 w-full h-full min-h-screen bg-slate-50 overflow-y-auto overflow-x-hidden">
        <Reports />
      </div>
    </PageTransition>
  );
}
