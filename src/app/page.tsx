
"use client"; // This directive marks the component as a Client Component

import React from 'react';
import { Header } from "@/components/layout/header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function HomePage() {
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header />
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:p-8">
        <DashboardContent />
      </main>
      <footer className="py-6 px-4 md:px-8 text-center text-sm text-muted-foreground">
        {currentYear !== null ? <>© {currentYear} ClockHeat. All rights reserved.</> : null}
      </footer>
    </div>
  );
}
