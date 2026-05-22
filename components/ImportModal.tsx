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
import { SubscriptionInput } from "@/lib/subscriptions";
import { renderSubscriptionIcon } from "./icon-utils";

type Step = "upload" | "preview" | "confirm";

interface ImportModalProps {
  isDarkMode: boolean;
  onImport: (subscriptions: SubscriptionInput[]) => Promise<void>;
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

function pivotToInput(p: PivotRow): SubscriptionInput {
  return {
    name: p.name,
    amount: p.averageAmount,
    currency: p.currency,
    frequency: p.frequency,
    dayOfMonth: p.dayOfMonth,
    startDate: p.startDate,
    endDate: p.endDate,
    category: p.category || null,
    color: null,
  };
}

const ImportModal: React.FC<ImportModalProps> = ({
  isDarkMode,
  onImport,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Parsed state
  const [format, setFormat] = useState<"bank" | "pivot" | null>(null);
  const [bankCandidates, setBankCandidates] = useState<RecurringCandidate[]>([]);
  const [pivotRows, setPivotRows] = useState<PivotRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

  const processFile = useCallback((text: string) => {
    setError(null);
    const rows = parseCsv(text);
    const fmt = detectFormat(rows);

    if (fmt === "unknown") {
      setError(
        "Could not detect CSV format. Expected either a bank statement (with date/description/amount columns) or a pivot sheet (with month columns like 'Jan 2024')."
      );
      return;
    }

    if (fmt === "pivot") {
      const parsed = parsePivotCsv(rows);
      if (parsed.length === 0) {
        setError("No subscription rows found in pivot format.");
        return;
      }
      setPivotRows(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setFormat("pivot");
    } else {
      const headers = rows[0];
      const mapping: ColumnMapping | null = detectColumns(
        headers.map((h) => h.toLowerCase())
      );
      if (!mapping) {
        setError("Could not detect date/description/amount columns.");
        return;
      }
      const transactions = parseBankStatement(rows.slice(1), mapping);
      const candidates = detectRecurring(transactions);
      if (candidates.length === 0) {
        setError(
          "No recurring charges detected. Try a longer statement (3+ months)."
        );
        return;
      }
      setBankCandidates(candidates);
      setSelected(new Set(candidates.map((_, i) => i)));
      setFormat("bank");
    }

    setStep("preview");
  }, []);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setError("Please upload a .csv or .txt file.");
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

  const toggleAll = () => {
    const total = format === "pivot" ? pivotRows.length : bankCandidates.length;
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
      const inputs: SubscriptionInput[] =
        format === "pivot"
          ? pivotRows.filter((_, i) => selected.has(i)).map(pivotToInput)
          : bankCandidates.filter((_, i) => selected.has(i)).map(toInput);
      await onImport(inputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setSaving(false);
    }
  };

  const FREQ_LABEL: Record<string, string> = {
    monthly: "Monthly",
    yearly: "Yearly",
    quarterly: "Quarterly",
    biannually: "Bi-annually",
    weekly: "Weekly",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
        {/* Header */}
        <div className="flex items-center p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold flex-1">
            {step === "upload" && "Import subscriptions"}
            {step === "preview" && (
              <>
                {format === "pivot" ? "Pivot sheet" : "Detected recurring charges"}{" "}
                <span className="text-sm font-normal text-gray-400">
                  ({format === "pivot" ? pivotRows.length : bankCandidates.length} found)
                </span>
              </>
            )}
            {step === "confirm" && "Imported!"}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Upload a CSV file — either a <strong className="text-gray-300">bank / credit card statement</strong> or a{" "}
                <strong className="text-gray-300">pivot sheet</strong> (rows = subscriptions, columns = months).
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
                <span className="text-sm text-gray-400">Drag & drop or click to select</span>
                <span className="text-xs text-gray-500">.csv or .txt</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); } }}
                />
              </label>

              <details className="text-xs text-gray-500 space-y-1">
                <summary className="cursor-pointer hover:text-gray-400">Supported formats</summary>
                <div className="mt-2 space-y-2 pl-2">
                  <p><strong>Bank statement:</strong> any CSV with date, description, and amount columns. Recurring charges (same merchant, similar amount, 2+ times) are auto-detected.</p>
                  <p><strong>Pivot sheet:</strong> rows = subscriptions, columns include Name, Category, Interval (optional), and month columns like <code>Jan 2024</code>, <code>02/2024</code>, or <code>2024-03</code>.</p>
                </div>
              </details>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* ── Step 2: Preview / select ── */}
          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {selected.size} of {format === "pivot" ? pivotRows.length : bankCandidates.length} selected
                </span>
                <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 underline">
                  {selected.size === (format === "pivot" ? pivotRows.length : bankCandidates.length) ? "Deselect all" : "Select all"}
                </button>
              </div>

              {format === "pivot" &&
                pivotRows.map((row, i) => (
                  <div key={i} className={rowCls(selected.has(i))} onClick={() => toggle(i)}>
                    <input type="checkbox" readOnly checked={selected.has(i)} className="flex-shrink-0" />
                    <div className="w-8 h-8 flex-shrink-0">
                      {renderSubscriptionIcon(row.name, null, "w-full h-full")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{row.name}</div>
                      <div className="text-xs text-gray-400">
                        {row.category && <span className="mr-2">{row.category}</span>}
                        {FREQ_LABEL[row.frequency] ?? row.frequency}
                        {row.endDate && <span className="ml-2 text-yellow-500">ended {row.endDate}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold">
                        {row.averageAmount.toLocaleString("en", { style: "currency", currency: row.currency })}
                      </div>
                      <div className="text-xs text-gray-500">since {row.startDate.slice(0, 7)}</div>
                    </div>
                  </div>
                ))}

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
                        {FREQ_LABEL[c.frequency]} · {c.occurrences.length}× seen · day {c.dayOfMonth}
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
              Cancel
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setError(null); }}
                className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0 || saving}
                className="flex-1 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Importing…" : `Import ${selected.size} subscription${selected.size !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
