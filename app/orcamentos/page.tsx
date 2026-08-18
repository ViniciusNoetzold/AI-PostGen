'use client';

import dynamic from 'next/dynamic';

const QuoteProApp = dynamic(
  () => import('@/components/quotepro/QuoteProApp').then((mod) => mod.QuoteProApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[80vh] items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Carregando QuotePRO Orçamentos...</span>
        </div>
      </div>
    ),
  }
);

export default function OrcamentosPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <QuoteProApp />
    </div>
  );
}
