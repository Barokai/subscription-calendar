"use client";

import React, { useState } from "react";
import { Subscription, SubscriptionInput } from "@/lib/subscriptions";
import { renderSubscriptionIcon } from "./icon-utils";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD"];
const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Bi-annually" },
  { value: "weekly", label: "Weekly" },
];
const CATEGORIES = [
  "Entertainment",
  "Music",
  "Productivity",
  "Storage",
  "Gaming",
  "News & Media",
  "Health & Fitness",
  "Finance",
  "Education",
  "Shopping",
  "Utilities",
  "Software",
  "Other",
];

interface SubscriptionFormProps {
  isDarkMode: boolean;
  subscription?: Subscription;
  onSave: (input: SubscriptionInput) => Promise<void>;
  onCancel: () => void;
}

const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  isDarkMode,
  subscription,
  onSave,
  onCancel,
}) => {
  const isEdit = !!subscription;

  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(subscription?.currency ?? "EUR");
  const [frequency, setFrequency] = useState(subscription?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(subscription?.dayOfMonth?.toString() ?? "1");
  const [category, setCategory] = useState(subscription?.category ?? "");
  const [customCategory, setCustomCategory] = useState("");
  const [startDate, setStartDate] = useState(subscription?.startDate ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(subscription?.endDate ?? "");
  const [color, setColor] = useState(subscription?.color ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomCategory = category === "__custom__";
  const effectiveCategory = isCustomCategory ? customCategory : category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!name.trim()) { setError("Name is required"); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError("Enter a valid positive amount"); return; }
    const parsedDay = parseInt(dayOfMonth);
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) { setError("Day must be 1–31"); return; }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        currency,
        frequency,
        dayOfMonth: parsedDay,
        category: effectiveCategory || null,
        startDate,
        endDate: endDate || null,
        color: color || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  const bg = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${isDarkMode ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900"}`;
  const labelCls = "block text-xs font-medium mb-1 text-gray-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
      <div className={`w-full max-w-md rounded-xl shadow-2xl p-5 ${bg}`}>
        <div className="flex items-center mb-4">
          {name && (
            <div className="w-8 h-8 mr-3 flex-shrink-0">
              {renderSubscriptionIcon(name, color || null, "w-full h-full")}
            </div>
          )}
          <h2 className="text-lg font-bold flex-1">{isEdit ? "Edit Subscription" : "Add Subscription"}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 ml-2">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Netflix, Spotify…"
              autoFocus
            />
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>Amount *</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="9.99"
              />
            </div>
            <div className="w-24">
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Frequency + Day */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>Billing frequency</label>
              <select className={inputCls} value={frequency} onChange={e => setFrequency(e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className={labelCls}>Day of month</label>
              <input
                className={inputCls}
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <select
              className={inputCls}
              value={isCustomCategory ? "__custom__" : category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">— None —</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">Custom…</option>
            </select>
            {isCustomCategory && (
              <input
                className={`${inputCls} mt-1`}
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Enter category name"
                autoFocus
              />
            )}
          </div>

          {/* Start + End date */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>Start date *</label>
              <input className={inputCls} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>End date (optional)</label>
              <input className={inputCls} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Color override */}
          <div>
            <label className={labelCls}>Brand color override (optional)</label>
            <div className="flex gap-2 items-center">
              <input
                className={`${inputCls} flex-1`}
                value={color}
                onChange={e => setColor(e.target.value.replace(/^#/, ""))}
                placeholder="hex without # e.g. E50914"
                maxLength={6}
              />
              {color && (
                <div className="w-8 h-8 rounded-full border border-gray-600 flex-shrink-0" style={{ backgroundColor: `#${color}` }} />
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionForm;
