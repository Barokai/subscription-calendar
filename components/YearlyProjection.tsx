"use client";

import React, { useMemo } from "react";
import { Subscription } from "@/lib/subscriptions";
import { isPaymentInMonth } from "@/lib/frequency-utils";
import { parseDate } from "./date-utils";
import { useI18n } from "@/lib/i18n";

interface YearlyProjectionProps {
  subscriptions: Subscription[];
  userLocale: string;
  isDarkMode: boolean;
}

/** Normalise any billing frequency to an annual multiplier. */
function annualMultiplier(frequency: string): number {
  switch (frequency) {
    case "yearly":     return 1;
    case "biannually": return 2;
    case "quarterly":  return 4;
    case "monthly":    return 12;
    case "biweekly":   return 26;
    case "weekly":     return 52;
    case "daily":      return 365;
    default:           return 12;
  }
}

/** Annual cost for a single subscription. */
function annualCost(sub: Subscription): number {
  return sub.amount * annualMultiplier(sub.frequency);
}

const YearlyProjection: React.FC<YearlyProjectionProps> = ({
  subscriptions,
  userLocale,
  isDarkMode,
}) => {
  const { t, tpl } = useI18n();
  const currency = subscriptions.length > 0
    ? subscriptions[0].currency.replace("€", "EUR")
    : "EUR";

  const fmt = (n: number) =>
    n.toLocaleString(userLocale, { style: "currency", currency, maximumFractionDigits: 0 });

  const fmtExact = (n: number) =>
    n.toLocaleString(userLocale, { style: "currency", currency, minimumFractionDigits: 2 });

  // Only include subscriptions that haven't ended
  const activeNow = useMemo(() => {
    const today = new Date();
    return subscriptions.filter((s) => {
      if (!s.endDate) { return true; }
      return new Date(s.endDate) >= today;
    });
  }, [subscriptions]);

  /** 12-month forward projection starting from next month */
  const monthlyProjection = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const total = activeNow.reduce((sum, sub) => {
        const start = parseDate(sub.startDate, userLocale);
        return sum + (isPaymentInMonth(sub.frequency, start, m, y) ? sub.amount : 0);
      }, 0);
      return {
        label: d.toLocaleString(userLocale, { month: "short", year: "2-digit" }),
        total,
      };
    });
  }, [activeNow, userLocale]);

  const projectedAnnual = monthlyProjection.reduce((s, m) => s + m.total, 0);
  const maxMonthly = Math.max(...monthlyProjection.map((m) => m.total), 1);

  // Annual breakdown per subscription, sorted descending
  const breakdown = useMemo(
    () => [...activeNow].sort((a, b) => annualCost(b) - annualCost(a)),
    [activeNow]
  );

  // Savings insights: subscriptions grouped by category
  const duplicateCategories = useMemo(() => {
    const byCat: Record<string, Subscription[]> = {};
    for (const sub of activeNow) {
      const cat = sub.category ?? "Uncategorized";
      if (!byCat[cat]) { byCat[cat] = []; }
      byCat[cat].push(sub);
    }
    return Object.entries(byCat)
      .filter(([, subs]) => subs.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);
  }, [activeNow]);

  const categoryAnnualOverview = useMemo(
    () =>
      duplicateCategories.map(([category, subs]) => {
        const annualTotal = subs.reduce((sum, sub) => sum + annualCost(sub), 0);
        return { category, subs, annualTotal };
      }),
    [duplicateCategories]
  );

  const bg = isDarkMode ? "bg-gray-900" : "bg-white";
  const border = isDarkMode ? "border-gray-700" : "border-gray-200";
  const cardBg = isDarkMode ? "bg-gray-800" : "bg-gray-50";
  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";
  const text = isDarkMode ? "text-white" : "text-gray-900";
  const subtext = isDarkMode ? "text-gray-300" : "text-gray-700";

  if (activeNow.length === 0) {
    return null;
  }

  return (
    <div className={`mt-6 rounded-lg overflow-hidden border ${border} ${bg}`}>
      <h2 className={`text-lg font-semibold p-4 ${cardBg} ${text}`}>
        {t.yearlyProjection.title}
      </h2>

      {/* ── 12-month bar chart ── */}
      <div className="p-4">
        <p className={`text-xs uppercase tracking-wider mb-3 ${muted}`}>
          {tpl(t.yearlyProjection.next12MonthsLabel, { total: fmt(projectedAnnual) })}
        </p>
        <div className="flex items-end gap-1 h-20">
          {monthlyProjection.map((m, i) => {
            const pct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0;
            const isFirst = i === 0;
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full relative group">
                  {/* tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {fmtExact(m.total)}
                  </div>
                  <div
                    className={`w-full rounded-t-sm transition-all ${isFirst ? "bg-blue-500" : "bg-blue-700"}`}
                    style={{ height: `${Math.max(pct, 4)}%`, maxHeight: "100%" }}
                  />
                </div>
                <span className={`text-[9px] leading-tight ${muted}`}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Savings insights ── */}
      {duplicateCategories.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className={`text-xs uppercase tracking-wider ${muted}`}>{t.yearlyProjection.savingsInsights}</p>
          {duplicateCategories.map(([cat, subs]) => {
            const catAnnual = subs.reduce((s, sub) => s + annualCost(sub), 0);
            const cheapest = [...subs].sort((a, b) => annualCost(a) - annualCost(b))[0];
            const saveable = catAnnual - annualCost(cheapest);
            return (
              <div
                key={cat}
                className={`flex items-start gap-2 p-3 rounded-lg border ${border} ${cardBg}`}
              >
                <span className="text-yellow-400 mt-0.5">⚠</span>
                <div>
                  <p className={`text-sm font-medium ${subtext}`}>
                    {tpl(t.yearlyProjection.savingsMessage, { count: subs.length, category: cat, amount: fmt(saveable) })}
                  </p>
                  <p className={`text-xs ${muted}`}>
                    {subs.map((s) => tpl(t.yearlyProjection.savingsDetail, { name: s.name, amount: fmtExact(s.amount), frequency: s.frequency })).join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categoryAnnualOverview.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className={`text-xs uppercase tracking-wider ${muted}`}>{t.yearlyProjection.categoryAnnualCostBreakdown}</p>
          {categoryAnnualOverview.map(({ category, subs, annualTotal }) => (
            <div
              key={category}
              className={`rounded-lg border ${border} ${cardBg} p-3`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className={`text-sm font-medium ${subtext}`}>{category}</p>
                  <p className={`text-xs ${muted}`}>{subs.length} {t.yearlyProjection.categoryRecurringCostsLabel}</p>
                </div>
                <p className={`text-sm font-semibold ${text}`}>{tpl(t.yearlyProjection.costPerYear, { amount: fmt(annualTotal) })}</p>
              </div>
              <div className={`mt-2 text-xs ${muted} space-y-1`}>
                {subs
                  .slice()
                  .sort((a, b) => annualCost(b) - annualCost(a))
                  .map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{sub.name}</span>
                      <span>{tpl(t.yearlyProjection.costPerYear, { amount: fmtExact(annualCost(sub)) })}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Per-subscription annual breakdown ── */}
      <div className="px-4 pb-4">
        <p className={`text-xs uppercase tracking-wider mb-2 ${muted}`}>{t.yearlyProjection.annualCostBreakdown}</p>
        <div className="space-y-1">
          {breakdown.map((sub) => {
            const yearly = annualCost(sub);
            const pct = projectedAnnual > 0 ? (yearly / projectedAnnual) * 100 : 0;
            return (
              <div key={sub.id} className="flex items-center gap-2">
                <div className={`text-sm flex-1 min-w-0 ${subtext}`}>
                  <span className="truncate">{sub.name}</span>
                  {sub.category && <span className={`ml-1.5 text-xs ${muted}`}>· {sub.category}</span>}
                </div>
                <span className={`text-xs ${muted} w-20 text-right`}>
                  {sub.frequency !== "yearly" ? tpl(t.yearlyProjection.costPerFrequency, { amount: fmtExact(sub.amount), frequency: sub.frequency }) : ""}
                </span>
                <span className={`text-sm font-medium w-20 text-right ${text}`}>{tpl(t.yearlyProjection.costPerYear, { amount: fmt(yearly) })}</span>
                <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default YearlyProjection;
