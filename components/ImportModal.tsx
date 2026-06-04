"use client";

import React, { useState, useCallback } from "react";
import {
  parseCsv,
  detectFormat,
  detectColumns,
  parseBankStatement,
  detectRecurring,
  parsePivotCsv,
  type RecurringCandidate,
  type PivotRow,
  type ColumnMapping,
} from "@/lib/csv-import";
import { Subscription, SubscriptionInput } from "@/lib/subscriptions";
import { Income, IncomeInput } from "@/lib/incomes";
import { CreditCard } from "@/lib/credit-cards";
import { renderSubscriptionIcon } from "./icon-utils";
import { useI18n } from "@/lib/i18n";
import ModalBackdrop from "./modal-backdrop";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Step = "upload" | "preview";
type PivotType = "expenses" | "income";

interface ImportModalProps {
  isDarkMode: boolean;
  existingSubscriptions: Subscription[];
  existingIncomes: Income[];
  creditCards: CreditCard[];
  onImport: (subscriptions: SubscriptionInput[]) => Promise<void>;
  onImportIncomes?: (incomes: IncomeInput[]) => Promise<void>;
  onCancel: () => void;
}

function toInput(c: RecurringCandidate): SubscriptionInput {
  return {
    name: c.name,
    amount: c.averageAmount,
    currency: "EUR",
    frequency: c.frequency,
    dayOfMonth: c.dayOfMonth,
    startDate: c.firstSeen.toISOString().slice(0, 10),
    endDate: null,
    category: null,
    color: null,
  };
}

function pivotToExpenseInput(p: PivotRow, dayOfMonth: number): SubscriptionInput {
  return {
    name: p.name,
    amount: p.averageAmount,
    currency: p.currency,
    frequency: p.frequency,
    dayOfMonth,
    startDate: p.startDate,
    endDate: p.endDate,
    category: p.category || null,
    color: null,
  };
}

function pivotToIncomeInput(p: PivotRow, dayOfMonth: number): IncomeInput {
  return {
    name: p.name,
    amount: p.averageAmount,
    currency: p.currency,
    dayOfMonth,
    startDate: p.startDate,
    endDate: p.endDate,
  };
}

const ImportModal: React.FC<ImportModalProps> = ({
  isDarkMode,
  existingSubscriptions,
  existingIncomes,
  creditCards,
  onImport,
  onImportIncomes,
  onCancel,
}) => {
  const { t, tpl } = useI18n();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [format, setFormat] = useState<"bank" | "pivot" | null>(null);
  const [bankCandidates, setBankCandidates] = useState<RecurringCandidate[]>([]);
  const [pivotRows, setPivotRows] = useState<PivotRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [pivotType, setPivotType] = useState<PivotType>("expenses");
  const [defaultDayOfMonth, setDefaultDayOfMonth] = useState("1");
  const [importPaymentMethod, setImportPaymentMethod] = useState<"bank" | "credit_card">("bank");
  const [importCreditCardId, setImportCreditCardId] = useState("");

  const bg = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${isDarkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`;
  const rowCls = (active: boolean) =>
    `flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
      active
        ? "border-blue-500 bg-blue-900 bg-opacity-20"
        : isDarkMode
        ? "border-gray-700 hover:border-gray-500"
        : "border-gray-200 hover:border-gray-400"
    }`;

  const isDuplicate = useCallback((name: string) => {
    const n = name.toLowerCase().trim();
    if (pivotType === "income") {
      return existingIncomes.some((i) => i.name.toLowerCase().trim() === n);
    }
    return existingSubscriptions.some((s) => s.name.toLowerCase().trim() === n);
  }, [pivotType, existingSubscriptions, existingIncomes]);

  useEscapeKey(onCancel, true);

  const processFile = useCallback((text: string) => {
    setError(null);
    const rows = parseCsv(text);
    const fmt = detectFormat(rows);

    if (fmt === "unknown") {
      setError(t.importModal.unknownFormatError);
      return;
    }

    if (fmt === "pivot") {
      const parsed = parsePivotCsv(rows);
      if (parsed.length === 0) {
        setError(t.importModal.noRowsError);
        return;
      }
      setPivotRows(parsed);
      // Pre-deselect rows matching existing subscriptions (default type is "expenses")
      const existingNames = new Set(
        existingSubscriptions.map((s) => s.name.toLowerCase().trim())
      );
      setSelected(
        new Set(
          parsed
            .map((row, i) => ({ row, i }))
            .filter(({ row }) => !existingNames.has(row.name.toLowerCase().trim()))
            .map(({ i }) => i)
        )
      );
      setFormat("pivot");
    } else {
      const headers = rows[0];
      const mapping: ColumnMapping | null = detectColumns(
        headers.map((h) => h.toLowerCase())
      );
      if (!mapping) {
        setError(t.importModal.detectColumnError);
        return;
      }
      const transactions = parseBankStatement(rows.slice(1), mapping);
      const candidates = detectRecurring(transactions);
      if (candidates.length === 0) {
        setError(t.importModal.noRecurringError);
        return;
      }
      setBankCandidates(candidates);
      setSelected(new Set(candidates.map((_, i) => i)));
      setFormat("bank");
    }

    setStep("preview");
  }, [existingSubscriptions, t]);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setError(t.importModal.invalidFileError);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processFile(e.target?.result as string);
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { handleFile(file); }
  };

  const total = format === "pivot" ? pivotRows.length : bankCandidates.length;

  const toggleAll = () => {
    if (selected.size === total) {
      setSelected(new Set());
    } else {
      setSelected(new Set(Array.from({ length: total }, (_, i) => i)));
    }
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) { next.delete(i); } else { next.add(i); }
    setSelected(next);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const day = Math.max(1, Math.min(31, parseInt(defaultDayOfMonth) || 1));
      if (format === "pivot" && pivotType === "income") {
        const inputs: IncomeInput[] = pivotRows
          .filter((_, i) => selected.has(i))
          .map((p) => pivotToIncomeInput(p, day));
        if (onImportIncomes) { await onImportIncomes(inputs); }
      } else {
        if (importPaymentMethod === "credit_card" && !importCreditCardId) {
          setError(t.importModal.errorCreditCardRequired);
          setSaving(false);
          return;
        }
        const assignedCardId = importPaymentMethod === "credit_card" ? importCreditCardId : null;
        const inputs: SubscriptionInput[] =
          format === "pivot"
            ? pivotRows
                .filter((_, i) => selected.has(i))
                .map((p) => ({
                  ...pivotToExpenseInput(p, day),
                  paymentMethod: importPaymentMethod,
                  creditCardId: assignedCardId,
                }))
            : bankCandidates
                .filter((_, i) => selected.has(i))
                .map((candidate) => ({
                  ...toInput(candidate),
                  paymentMethod: importPaymentMethod,
                  creditCardId: assignedCardId,
                }));
        await onImport(inputs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importModal.importFailedError);
      setSaving(false);
    }
  };

  const FREQ_LABEL: Record<string, string> = {
    monthly: t.importModal.frequencyMonthly,
    yearly: t.importModal.frequencyYearly,
    quarterly: t.importModal.frequencyQuarterly,
    biannually: t.importModal.frequencyBiannually,
    weekly: t.importModal.frequencyWeekly,
  };

  const confirmLabel = () => {
    if (saving) return t.importModal.importingLabel;
    if (format === "pivot" && pivotType === "income") {
      return selected.size !== 1
        ? tpl(t.importModal.importIncomeButtonPlural, { count: selected.size })
        : tpl(t.importModal.importIncomeButton, { count: selected.size });
    }
    return selected.size !== 1
      ? tpl(t.importModal.importButtonPlural, { count: selected.size })
      : tpl(t.importModal.importButton, { count: selected.size });
  };

  return (
    <ModalBackdrop panelClassName="max-w-lg">
      <div className={`w-full flex flex-col max-h-[90vh] ${bg}`}>
        {/* Header */}
        <div className="flex items-center p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold flex-1">
            {step === "upload" && t.importModal.uploadTitle}
            {step === "preview" && (
              <>
                {format === "pivot" ? t.importModal.previewPivotTitle : t.importModal.previewTitle}{" "}
                <span className="text-sm font-normal text-gray-400">
                  ({tpl(t.importModal.previewFoundCount, { count: total })})
                </span>
              </>
            )}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                {t.importModal.uploadInstructions}
              </p>

              <label
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-900 bg-opacity-10"
                    : isDarkMode
                    ? "border-gray-600 hover:border-gray-400"
                    : "border-gray-300 hover:border-gray-500"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <span className="text-3xl">📄</span>
                <span className="text-sm text-gray-400">{t.importModal.dragDropText}</span>
                <span className="text-xs text-gray-500">{t.importModal.fileFormats}</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); } }}
                />
              </label>

              <details className="text-xs text-gray-500 space-y-1">
                <summary className="cursor-pointer hover:text-gray-400">{t.importModal.supportedFormatsTitle}</summary>
                <div className="mt-2 space-y-2 pl-2">
                  <p><strong>{t.importModal.bankStatementLabel}</strong> {t.importModal.bankStatementDesc}</p>
                  <p><strong>{t.importModal.pivotSheetLabel}</strong> {t.importModal.pivotSheetDesc}</p>
                </div>
              </details>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* ── Step 2: Preview / select ── */}
          {step === "preview" && (
            <div className="space-y-3">
              {/* Pivot-specific options: type selector + billing day */}
              {format === "pivot" && (
                <div className={`flex gap-3 p-3 rounded-lg ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">{t.importModal.pivotTypeLabel}</label>
                    <select
                      className={inputCls}
                      value={pivotType}
                      onChange={(e) => setPivotType(e.target.value as PivotType)}
                    >
                      <option value="expenses">{t.importModal.pivotTypeExpenses}</option>
                      <option value="income">{t.importModal.pivotTypeIncome}</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-gray-400 mb-1">{t.importModal.defaultDayLabel}</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className={inputCls}
                      value={defaultDayOfMonth}
                      onChange={(e) => setDefaultDayOfMonth(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {(format === "bank" || (format === "pivot" && pivotType === "expenses")) && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t.importModal.importPaymentMethodLabel}</label>
                    <select
                      className={inputCls}
                      value={importPaymentMethod}
                      onChange={(e) => {
                        const nextMethod = e.target.value as "bank" | "credit_card";
                        setImportPaymentMethod(nextMethod);
                        if (nextMethod === "bank") {
                          setImportCreditCardId("");
                        }
                      }}
                    >
                      <option value="bank">{t.importModal.importPaymentMethodBank}</option>
                      <option value="credit_card">{t.importModal.importPaymentMethodCreditCard}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t.importModal.importCreditCardLabel}</label>
                    <select
                      className={`${inputCls} ${importPaymentMethod !== "credit_card" ? "opacity-60 cursor-not-allowed" : ""}`}
                      value={importPaymentMethod === "credit_card" ? importCreditCardId : ""}
                      onChange={(e) => setImportCreditCardId(e.target.value)}
                      disabled={importPaymentMethod !== "credit_card"}
                    >
                      <option value="">{t.importModal.importCreditCardPlaceholder}</option>
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {importPaymentMethod === "credit_card" && creditCards.length === 0 && (
                    <p className="text-xs text-amber-400 sm:col-span-2">{t.importModal.noCreditCardsHint}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {tpl(t.importModal.selectedCount, { selected: selected.size, total })}
                </span>
                <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 underline">
                  {selected.size === total ? t.importModal.deselectAll : t.importModal.selectAll}
                </button>
              </div>

              {format === "pivot" &&
                pivotRows.map((row, i) => {
                  const dup = isDuplicate(row.name);
                  return (
                    <div key={i} className={rowCls(selected.has(i))} onClick={() => toggle(i)}>
                      <input type="checkbox" readOnly checked={selected.has(i)} className="flex-shrink-0" />
                      <div className="w-8 h-8 flex-shrink-0">
                        {renderSubscriptionIcon(row.name, null, "w-full h-full")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{row.name}</div>
                        <div className="text-xs text-gray-400 flex flex-wrap gap-x-2 gap-y-0.5">
                          {row.category && <span>{row.category}</span>}
                          <span>{FREQ_LABEL[row.frequency] ?? row.frequency}</span>
                          {row.endDate && (
                            <span className="text-yellow-500">{tpl(t.importModal.endedLabel, { endDate: row.endDate })}</span>
                          )}
                          {row.hasPriceVariance && (
                            <span
                              className="text-amber-400"
                              title={tpl(t.importModal.priceVarianceWarning, { min: row.minAmount.toFixed(2), max: row.maxAmount.toFixed(2) })}
                            >
                              {t.importModal.priceVariesLabel}
                            </span>
                          )}
                          {dup && (
                            <span className="text-orange-400">⚠ {t.importModal.duplicateWarning}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold">
                          {row.averageAmount.toLocaleString("en", { style: "currency", currency: row.currency })}
                        </div>
                        <div className="text-xs text-gray-500">since {row.startDate.slice(0, 7)}</div>
                      </div>
                    </div>
                  );
                })}

              {format === "bank" &&
                bankCandidates.map((c, i) => (
                  <div key={i} className={rowCls(selected.has(i))} onClick={() => toggle(i)}>
                    <input type="checkbox" readOnly checked={selected.has(i)} className="flex-shrink-0" />
                    <div className="w-8 h-8 flex-shrink-0">
                      {renderSubscriptionIcon(c.name, null, "w-full h-full")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{c.name}</div>
                      <div className="text-xs text-gray-400">
                        {FREQ_LABEL[c.frequency]} · {tpl(t.importModal.timesSeenLabel, { count: c.occurrences.length })} · {tpl(t.importModal.dayOfMonthLabel, { day: c.dayOfMonth })}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold">
                        {c.averageAmount.toLocaleString("en", { style: "currency", currency: "EUR" })}
                      </div>
                      <div className="text-xs text-gray-500">
                        since {c.firstSeen.toISOString().slice(0, 7)}
                      </div>
                    </div>
                  </div>
                ))}

              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-700 flex-shrink-0 flex gap-2">
          {step === "upload" && (
            <button onClick={onCancel} className={`flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors`}>
              {t.importModal.cancelButton}
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setError(null); }}
                className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
              >
                {t.importModal.backButton}
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0 || saving}
                className="flex-1 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {confirmLabel()}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
};

export default ImportModal;
