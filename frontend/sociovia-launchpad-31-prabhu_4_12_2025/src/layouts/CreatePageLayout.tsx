// src/layouts/CreatePageLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Stepper as RouteStepper } from "@/components/Stepper";

export default function CreatePageLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white">
        <RouteStepper allowSkip={false} completedSteps={[1]} />
      </header>

      <div className="max-w-6xl mx-auto p-4 md:flex gap-6">
        <main className="md:flex-1">
          <Outlet />
        </main>

        <aside className="hidden md:block md:w-1/3">
          <div className="sticky top-20 bg-white rounded-lg p-4 shadow">
            <h3 className="font-medium">Preview</h3>
            <div className="mt-3 h-40 border rounded flex items-center justify-center text-gray-400">
              Ad preview placeholder
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
