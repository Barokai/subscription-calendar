"use client";

import React, { useState } from "react";
import { Subscription, SubscriptionInput } from "@/lib/subscriptions";
import { renderSubscriptionIcon } from "./icon-utils";
import { useI18n } from "@/lib/i18n";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD"];

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
  const { t } = useI18n();
  const isEdit = !!subscription;

  const FREQUENCIES = [
    { value: "monthly", label: t.subscriptionForm.frequencyMonthly },
    { value: "yearly", label: t.subscriptionForm.frequencyYearly },
    { value: "quarterly", label: t.subscriptionForm.frequencyQuarterly },
    { value: "biannually", label: t.subscriptionForm.frequencyBiannually },
    { value: "weekly", label: t.subscriptionForm.frequencyWeekly },
  ];
  const CATEGORIES = [
    t.subscriptionForm.categoryEntertainment,
    t.subscriptionForm.categoryMusic,
    t.subscriptionForm.categoryProductivity,
    t.subscriptionForm.categoryStorage,
    t.subscriptionForm.categoryGaming,
    t.subscriptionForm.categoryNewsMedia,
    t.subscriptionForm.categoryHealthFitness,
    t.subscriptionForm.categoryFinance,
    t.subscriptionForm.categoryEducation,
    t.subscriptionForm.categoryShopping,
    t.subscriptionForm.categoryUtilities,
    t.subscriptionForm.categorySoftware,
    t.subscriptionForm.categoryOther,
  ];

  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(subscription?.currency ?? "EUR");
  const [frequency, setFrequency] = useState(subscription?.frequency ?? "monthly");
  const [isOneTime, setIsOneTime] = useState(subscription?.frequency === "once");
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
    if (!name.trim()) { setError(t.subscriptionForm.errorNameRequired); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError(t.subscriptionForm.errorInvalidAmount); return; }
    const parsedDay = parseInt(dayOfMonth);
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) { setError(t.subscriptionForm.errorInvalidDay); return; }

    const effectiveFrequency = isOneTime ? "once" : frequency;
    const effectiveEndDate = isOneTime ? startDate : (endDate || null);

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        currency,
        frequency: effectiveFrequency,
        dayOfMonth: parsedDay,
        category: effectiveCategory || null,
        startDate,
        endDate: effectiveEndDate,
        color: color || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.subscriptionForm.errorSaveFailed);
      setSaving(false);
    }
  };

  const bg = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${isDarkMode ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900"}`;
  const labelCls = "block text-xs font-medium mb-1 text-gray-400";

  useEscapeKey(onCancel, true);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
      <div className={`w-full max-w-md rounded-xl shadow-2xl p-5 ${bg}`}>
        <div className="flex items-center mb-4">
          {name && (
            <div className="w-8 h-8 mr-3 flex-shrink-0">
              {renderSubscriptionIcon(name, color || null, "w-full h-full")}
            </div>
          )}
          <h2 className="text-lg font-bold flex-1">{isEdit ? t.subscriptionForm.editTitle : t.subscriptionForm.addTitle}</h2>
          <button type="button" aria-label={t.subscriptionForm.closeButton} onClick={onCancel} className="text-gray-400 hover:text-gray-200 ml-2">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className={labelCls}>{t.subscriptionForm.nameLabel}</label>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.subscriptionForm.namePlaceholder}
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
                placeholder={t.subscriptionForm.amountPlaceholder}
              />
            </div>
            <div className="w-24">
              <label className={labelCls}>{t.subscriptionForm.currencyLabel}</label>
              <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* One-time toggle */}
          <div className="flex items-center justify-between">
            <label className={labelCls}>{t.subscriptionForm.oneTimeLabel}</label>
            <input
              type="checkbox"
              checked={isOneTime}
              onChange={(e) => setIsOneTime(e.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 -mt-2">{t.subscriptionForm.oneTimeHelp}</p>

          {/* Frequency + Day */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>{t.subscriptionForm.frequencyLabel}</label>
              <select
                className={`${inputCls} ${isOneTime ? "opacity-60 cursor-not-allowed" : ""}`}
                value={isOneTime ? "once" : frequency}
                onChange={e => setFrequency(e.target.value)}
                disabled={isOneTime}
              >
                {isOneTime ? (
                  <option value="once">{t.subscriptionForm.frequencyOnce}</option>
                ) : (
                  FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)
                )}
              </select>
            </div>
            <div className="w-24">
              <label className={labelCls}>{t.subscriptionForm.dayOfMonthLabel}</label>
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
            <label className={labelCls}>{t.subscriptionForm.categoryLabel}</label>
            <select
              className={inputCls}
              value={isCustomCategory ? "__custom__" : category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">{t.subscriptionForm.categoryPlaceholder}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">{t.subscriptionForm.customCategoryOption}</option>
            </select>
            {isCustomCategory && (
              <input
                className={`${inputCls} mt-1`}
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder={t.subscriptionForm.customCategoryPlaceholder}
                autoFocus
              />
            )}
          </div>

          {/* Start + End date */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>{t.subscriptionForm.startDateLabel}</label>
              <input className={inputCls} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>{t.subscriptionForm.endDateLabel}</label>
              <input
                className={`${inputCls} ${isOneTime ? "opacity-60 cursor-not-allowed" : ""}`}
                type="date"
                value={isOneTime ? startDate : endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={isOneTime}
              />
            </div>
          </div>

          {/* Color override */}
          <div>
            <label className={labelCls}>{t.subscriptionForm.colorLabel}</label>
            <div className="flex gap-2 items-center">
              <input
                className={`${inputCls} flex-1`}
                value={color}
                onChange={e => setColor(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
                placeholder={t.subscriptionForm.colorPlaceholder}
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
              {t.subscriptionForm.cancelButton}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? t.subscriptionForm.savingLabel : isEdit ? t.subscriptionForm.saveButton : t.subscriptionForm.addButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionForm;
