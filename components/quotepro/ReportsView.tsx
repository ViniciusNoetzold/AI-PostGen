'use client';

import { useMemo } from "react";
import { useAppContext } from "@/lib/quotepro/context";
import { t } from "@/lib/quotepro/i18n";
import { BarChart2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { calculateQuoteTotals, formatCurrency } from "@/lib/quotepro/calculations";
import { Currency } from "@/lib/quotepro/types";

export function ReportsView() {
  const { quotes, settings } = useAppContext();
  const lang = settings.language;

  const data = useMemo(() => {
    const draft = quotes.filter((q) => q.status === "draft").length;
    const sent = quotes.filter((q) => q.status === "sent").length;
    const approved = quotes.filter((q) => q.status === "approved").length;
    const rejected = quotes.filter((q) => q.status === "rejected").length;

    const totalSentOrMore = sent + approved + rejected;
    const approvalRate =
      totalSentOrMore > 0 ? (approved / totalSentOrMore) * 100 : 0;

    const revenueByCurrency = quotes
      .filter((q) => q.status === "approved")
      .reduce<Partial<Record<Currency, number>>>((totals, quote) => {
        totals[quote.currency] =
          (totals[quote.currency] || 0) +
          calculateQuoteTotals(quote).finalTotal;
        return totals;
      }, {});
    const revenueEntries = Object.entries(revenueByCurrency) as [
      Currency,
      number,
    ][];

    const statusData = [
      { name: t("draft", lang), value: draft, color: "#94a3b8" }, // slate-400
      { name: t("sent", lang), value: sent, color: "#3b82f6" }, // blue-500
      { name: t("approved", lang), value: approved, color: "#10b981" }, // emerald-500
      { name: t("rejected", lang), value: rejected, color: "#f43f5e" }, // rose-500
    ].filter((item) => item.value > 0);

    const monthlyData: Record<string, number> = {};
    quotes.forEach((q) => {
      const month = (q.date || "").substring(0, 7); // YYYY-MM
      if (month) {
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month]++;
      }
    });

    const barData = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));

    return { approvalRate, revenueEntries, statusData, barData };
  }, [quotes, lang]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
          <BarChart2 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t("metrics", lang)}
          </h1>
          <p className="text-sm text-slate-500">
            Relatórios e métricas consolidadas dos orçamentos emitidos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            {t("approvalRate", lang)}
          </h3>
          <p className="text-4xl font-black text-emerald-500">
            {data.approvalRate.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Baseado em orçamentos emitidos, aprovados e recusados.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            {t("totalRevenue", lang)}
          </h3>
          <div className="space-y-1">
            {data.revenueEntries.length ? (
              data.revenueEntries.map(([currency, value]) => (
                <p key={currency} className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {formatCurrency(value, currency)}
                </p>
              ))
            ) : (
              <p className="text-3xl font-black text-slate-400">
                {formatCurrency(0, "BRL")}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Soma dos orçamentos com status Aprovado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm">
            Distribuição por Status
          </h3>
          <div className="h-64">
            {data.statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Sem dados suficientes para exibir gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Volume */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm">
            {t("quotesByMonth", lang)}
          </h3>
          <div className="h-64">
            {data.barData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Sem histórico temporal ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.barData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Orçamentos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
