"use client";

import React, { useState, useEffect } from "react";
import { Income, IncomeInput } from "@/lib/incomes";
import { useI18n } from "@/lib/i18n";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import ModalBackdrop from "./modal-backdrop";

interface IncomeManagerProps {
  incomes: Income[];
  isDarkMode: boolean;
  userLocale: string;
  onAdd: (input: IncomeInput) => Promise<void>;
  onUpdate: (id: string, input: Partial<IncomeInput>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  requestEdit?: Income | null;
}

const EMPTY_FORM: IncomeInput = {
  name: "",
  amount: 0,
  currency: "EUR",
  dayOfMonth: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
};

const IncomeManager: React.FC<IncomeManagerProps> = ({
  incomes,
  isDarkMode,
  userLocale,
  onAdd,
  onUpdate,
  onRemove,
  requestEdit,
}) => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeInput>(EMPTY_FORM);
  const [isOneTime, setIsOneTime] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const bg = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white"
      : "bg-gray-50 border-gray-300 text-gray-900"
  }`;

  useEscapeKey(closeForm, showForm);

  // Trigger edit form when external requestEdit prop changes
  useEffect(() => {
    if (requestEdit) openEdit(requestEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestEdit]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setIsOneTime(false);
    setEditId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(income: Income) {
    setForm({
      name: income.name,
      amount: income.amount,
      currency: income.currency,
      dayOfMonth: income.dayOfMonth,
      startDate: income.startDate,
      endDate: income.endDate,
    });
    setIsOneTime(!!income.endDate && income.endDate === income.startDate);
    setEditId(income.id);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError(t.income.errorNameRequired); return; }
    if (!form.amount || form.amount <= 0) { setFormError(t.income.errorInvalidAmount); return; }

    try {
      setSaving(true);
      setFormError(null);
      const effectiveInput: IncomeInput = {
        ...form,
        endDate: isOneTime ? form.startDate : form.endDate,
      };
      if (editId) {
        await onUpdate(editId, effectiveInput);
      } else {
        await onAdd(effectiveInput);
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.income.errorSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.income.deleteConfirm)) { return; }
    await onRemove(id);
  }

  const monthlyTotal = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const formatCurrency = (amount: number, currency = "EUR") =>
    amount.toLocaleString(userLocale, { style: "currency", currency });

  return (
    <div className={`rounded-xl border ${isDarkMode ? "border-gray-700" : "border-gray-200"} ${bg}`}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"} rounded-t-xl`}>
        <h2 className="text-base font-semibold">{t.income.title}</h2>
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {incomes.length > 0 && (
            <span className="text-sm text-green-500 font-medium">
              {t.income.monthlyTotal}: {formatCurrency(monthlyTotal)}
            </span>
          )}
          <button
            onClick={openAdd}
            className="px-2.5 py-1.5 rounded-md text-sm bg-green-600 hover:bg-green-500 text-white font-medium transition-colors leading-tight whitespace-normal text-left"
          >
            + {t.income.addButton}
          </button>
        </div>
      </div>

      {/* Income list */}
      <div className="divide-y divide-gray-700">
        {incomes.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-500 italic">{t.income.noIncomesMessage}</p>
        ) : (
          incomes.map((inc) => {
            // A one-time income is encoded as startDate === endDate
            const isOneTimeIncome = !!inc.endDate && inc.endDate === inc.startDate;
            return (
            <div key={inc.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{inc.name}</div>
                <div className="text-xs text-gray-500">
                  {t.subscriptionForm.dayOfMonthLabel}: {inc.dayOfMonth} · {inc.currency}
                  {isOneTimeIncome && (
                    <span className="ml-2 text-blue-400">{t.income.oneTimeBadge}</span>
                  )}
                  {inc.endDate && (
                    <span className="ml-2 text-yellow-500">→ {inc.endDate}</span>
                  )}
                </div>
              </div>
              <div className="font-semibold text-green-500 text-sm flex-shrink-0">
                {formatCurrency(inc.amount, inc.currency)}
                {!isOneTimeIncome ? "/mo" : ""}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(inc)}
                  className="text-xs px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  ✏
                </button>
                <button
                  onClick={() => handleDelete(inc.id)}
                  className="text-xs px-2 py-1 rounded border border-red-700 hover:bg-red-900 text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ModalBackdrop onClose={closeForm} panelClassName="max-w-lg">
          <div className={`w-full p-6 ${bg}`} data-component="income-manager-form">
            <h3 className="text-lg font-bold mb-4">
              {editId ? t.income.editTitle : t.income.addTitle}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.income.nameLabel}</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t.income.namePlaceholder}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">{t.income.amountLabel}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputCls}
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium mb-1">{t.income.currencyLabel}</label>
                  <input
                    className={inputCls}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">{t.income.oneTimeLabel}</label>
                <input
                  type="checkbox"
                  checked={isOneTime}
                  onChange={(e) => setIsOneTime(e.target.checked)}
                  className="h-4 w-4 accent-green-500"
                />
              </div>
              <p className="text-xs text-gray-500 -mt-2">{t.income.oneTimeHelp}</p>
              <div>
                <label className="block text-sm font-medium mb-1">{t.income.dayOfMonthLabel}</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className={inputCls}
                  value={form.dayOfMonth}
                  onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">{t.income.startDateLabel}</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">{t.income.endDateLabel}</label>
                  <input
                    type="date"
                    className={`${inputCls} ${isOneTime ? "opacity-60 cursor-not-allowed" : ""}`}
                    value={isOneTime ? form.startDate : (form.endDate || "")}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
                    disabled={isOneTime}
                  />
                </div>
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  {t.income.cancelButton}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-md text-sm bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {saving
                    ? t.income.savingLabel
                    : editId
                    ? t.income.saveButton
                    : t.income.addSubmitButton}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
};

export default IncomeManager;
