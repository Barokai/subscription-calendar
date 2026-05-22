"use client";

import React, { useState, useMemo } from "react";
import { Subscription } from "@/lib/subscriptions";
import { Income } from "@/lib/incomes";
import { isPaymentInMonth } from "@/lib/frequency-utils";
import { useI18n } from "@/lib/i18n";

interface CashFlowProjectionProps {
  subscriptions: Subscription[];
  incomes: Income[];
  isDarkMode: boolean;
  userLocale: string;
}

interface MonthRow {
  label: string;
  isoMonth: string; // YYYY-MM
  incomeTotal: number;
  expenseTotal: number;
  net: number;
  runningBalance: number;
}

function getMonthLabel(date: Date, locale: string): string {
  return date.toLocaleString(locale, { month: "short", year: "numeric" });
}

const CashFlowProjection: React.FC<CashFlowProjectionProps> = ({
  subscriptions,
  incomes,
  isDarkMode,
  userLocale,
}) => {
  const { t, tpl } = useI18n();
  const [startBalance, setStartBalance] = useState<number>(0);
  const [startBalanceInput, setStartBalanceInput] = useState<string>("0");

  const months: MonthRow[] = useMemo(() => {
    const today = new Date();
    const rows: MonthRow[] = [];
    let running = startBalance;

    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const month = d.getMonth() + 1; // 1-based
      const year = d.getFullYear();

      // Subscriptions active this month
      const expenseTotal = subscriptions.reduce((sum, s) => {
        const startDate = new Date(s.startDate);
        if (!isPaymentInMonth(s.frequency, startDate, month, year)) { return sum; }
        return sum + s.amount;
      }, 0);

      // Incomes active this month (income.dayOfMonth is irrelevant for monthly total)
      const incomeTotal = incomes.reduce((sum, inc) => {
        const start = new Date(inc.startDate);
        const end = inc.endDate ? new Date(inc.endDate) : null;
        const inRange =
          (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() + 1 <= month)) &&
          (!end || end.getFullYear() > year || (end.getFullYear() === year && end.getMonth() + 1 >= month));
        return sum + (inRange ? inc.amount : 0);
      }, 0);

      const net = incomeTotal - expenseTotal;
      running += net;

      rows.push({
        label: getMonthLabel(d, userLocale),
        isoMonth: `${year}-${String(month).padStart(2, "0")}`,
        incomeTotal,
        expenseTotal,
        net,
        runningBalance: running,
      });
    }

    return rows;
  }, [subscriptions, incomes, startBalance, userLocale]);

  const firstNegativeMonth = months.find((m) => m.runningBalance < 0);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(userLocale, { style: "currency", currency: "EUR" });

  const bg = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800";
  const headerBg = isDarkMode ? "bg-gray-800 bg-opacity-80" : "bg-gray-50";
  const borderCls = isDarkMode ? "border-gray-700" : "border-gray-200";

  const maxExpense = Math.max(...months.map((m) => m.expenseTotal), 1);
  const maxIncome = Math.max(...months.map((m) => m.incomeTotal), 1);
  const barMax = Math.max(maxExpense, maxIncome);

  return (
    <div className={`rounded-xl border ${borderCls} ${bg}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${borderCls} ${headerBg} rounded-t-xl`}>
        <h2 className="text-base font-semibold mb-2">{t.cashFlow.title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">{t.cashFlow.startBalanceLabel}:</label>
            <input
              type="number"
              step="0.01"
              className={`w-32 px-2 py-1 rounded-md border text-sm ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              value={startBalanceInput}
              placeholder={t.cashFlow.startBalancePlaceholder}
              onChange={(e) => {
                setStartBalanceInput(e.target.value);
                setStartBalance(parseFloat(e.target.value) || 0);
              }}
            />
          </div>
          <span className="text-xs text-gray-500 italic">{t.cashFlow.startBalanceNote}</span>
        </div>
      </div>

      {/* Warning */}
      {firstNegativeMonth && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-900 bg-opacity-40 border border-red-700 text-sm text-red-300">
          ⚠ {tpl(t.cashFlow.negativeWarning, { month: firstNegativeMonth.label })}
        </div>
      )}

      {/* Bar chart */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex items-end gap-1 h-28 min-w-[500px]">
          {months.map((m) => {
            const incomeH = Math.round((m.incomeTotal / barMax) * 96);
            const expenseH = Math.round((m.expenseTotal / barMax) * 96);
            const isNegative = m.runningBalance < 0;
            return (
              <div
                key={m.isoMonth}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={`${m.label}: income ${formatCurrency(m.incomeTotal)}, expenses ${formatCurrency(m.expenseTotal)}, running ${formatCurrency(m.runningBalance)}`}
              >
                <div className="flex items-end gap-0.5 h-24">
                  {m.incomeTotal > 0 && (
                    <div
                      className="w-3 rounded-t bg-green-500 opacity-80"
                      style={{ height: `${incomeH}px` }}
                    />
                  )}
                  <div
                    className={`w-3 rounded-t ${isNegative ? "bg-red-500" : "bg-blue-500"} opacity-80`}
                    style={{ height: `${expenseH}px` }}
                  />
                </div>
                <span className={`text-[9px] ${isNegative ? "text-red-400 font-bold" : "text-gray-500"} whitespace-nowrap`}>
                  {m.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 bg-green-500 rounded-sm opacity-80" /> {t.cashFlow.incomeTotalHeader}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 bg-blue-500 rounded-sm opacity-80" /> {t.cashFlow.expenseTotalHeader}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className={`${isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t.cashFlow.monthHeader}</th>
              <th className="px-3 py-2 text-right font-medium text-green-500">{t.cashFlow.incomeTotalHeader}</th>
              <th className="px-3 py-2 text-right font-medium text-blue-400">{t.cashFlow.expenseTotalHeader}</th>
              <th className="px-3 py-2 text-right font-medium">{t.cashFlow.balanceHeader}</th>
              <th className="px-3 py-2 text-right font-medium">{t.cashFlow.runningBalanceHeader}</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? "divide-gray-700" : "divide-gray-100"}`}>
            {months.map((m) => {
              const isNegative = m.runningBalance < 0;
              return (
                <tr
                  key={m.isoMonth}
                  className={`${
                    isNegative
                      ? isDarkMode
                        ? "bg-red-900 bg-opacity-20"
                        : "bg-red-50"
                      : isDarkMode
                      ? "hover:bg-gray-700"
                      : "hover:bg-gray-50"
                  } transition-colors`}
                >
                  <td className="px-3 py-2">{m.label}</td>
                  <td className="px-3 py-2 text-right text-green-500">
                    {m.incomeTotal > 0 ? formatCurrency(m.incomeTotal) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-400">
                    {formatCurrency(m.expenseTotal)}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${m.net >= 0 ? "text-green-500" : "text-red-400"}`}>
                    {m.net >= 0 ? "+" : ""}{formatCurrency(m.net)}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${isNegative ? "text-red-400" : "text-gray-300"}`}>
                    {formatCurrency(m.runningBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowProjection;
