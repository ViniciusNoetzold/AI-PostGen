'use client';

import dynamic from "next/dynamic";

const ScraperApp = dynamic(
  () => import("@/components/scraper/ScraperApp").then((mod) => mod.ScraperApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[80vh] items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Carregando Web Scraping Pro...</span>
        </div>
      </div>
    ),
  }
);

export default function ScraperPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ScraperApp />
    </div>
  );
}
