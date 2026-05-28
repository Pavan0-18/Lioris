import React from "react";
import { AmbientPage } from "@/components/ambient-page";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AmbientPage>
      <div className="mx-auto max-w-2xl px-4 py-12">
        {children}
      </div>
    </AmbientPage>
  );
}
