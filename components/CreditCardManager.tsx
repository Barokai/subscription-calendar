"use client";

import React, { useMemo, useState } from "react";
import { CreditCard, CreditCardInput } from "@/lib/credit-cards";
import { Subscription } from "@/lib/subscriptions";
import { useI18n } from "@/lib/i18n";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import ModalBackdrop from "./modal-backdrop";

interface CreditCardManagerProps {
  creditCards: CreditCard[];
  subscriptions: Subscription[];
  isDarkMode: boolean;
  onAdd: (input: CreditCardInput) => Promise<void>;
  onUpdate: (id: string, input: Partial<CreditCardInput>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const EMPTY_FORM: CreditCardInput = {
  name: "",
  statementDay: 1,
  dueDay: 1,
};

const CreditCardManager: React.FC<CreditCardManagerProps> = ({
  creditCards,
  subscriptions,
  isDarkMode,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const { t, tpl } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreditCardInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white"
      : "bg-gray-50 border-gray-300 text-gray-900"
  }`;

  const linkedCountByCard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sub of subscriptions) {
      if (sub.paymentMethod !== "credit_card" || !sub.creditCardId) {
        continue;
      }
      counts.set(sub.creditCardId, (counts.get(sub.creditCardId) ?? 0) + 1);
    }
    return counts;
  }, [subscriptions]);

  useEscapeKey(closeForm, showForm);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(card: CreditCard) {
    setEditId(card.id);
    setForm({
      name: card.name,
      statementDay: card.statementDay,
      dueDay: card.dueDay,
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError(t.creditCards.errorNameRequired);
      return;
    }
    if (form.statementDay < 1 || form.statementDay > 31 || form.dueDay < 1 || form.dueDay > 31) {
      setError(t.creditCards.errorInvalidDay);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const input: CreditCardInput = {
        name: trimmedName,
        statementDay: form.statementDay,
        dueDay: form.dueDay,
      };
      if (editId) {
        await onUpdate(editId, input);
      } else {
        await onAdd(input);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.creditCards.errorSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(card: CreditCard) {
    const linkedCount = linkedCountByCard.get(card.id) ?? 0;
    const confirmed = window.confirm(
      tpl(t.creditCards.deleteConfirm, { name: card.name, count: linkedCount })
    );
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await onRemove(card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.creditCards.errorDeleteFailed);
    }
  }

  return (
    <div className={`rounded-xl border ${isDarkMode ? "border-gray-700" : "border-gray-200"} ${bg}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"} rounded-t-xl`}>
        <h2 className="text-base font-semibold">{t.creditCards.title}</h2>
        <button
          onClick={openAdd}
          className="px-3 py-1 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
        >
          + {t.creditCards.addButton}
        </button>
      </div>

      <div className="divide-y divide-gray-700">
        {creditCards.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-500 italic">{t.creditCards.noCardsMessage}</p>
        ) : (
          creditCards.map((card) => {
            const linkedCount = linkedCountByCard.get(card.id) ?? 0;
            return (
              <div key={card.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{card.name}</div>
                  <div className="text-xs text-gray-500">
                    {tpl(t.creditCards.statementDayLabelShort, { day: card.statementDay })} ·{" "}
                    {tpl(t.creditCards.dueDayLabelShort, { day: card.dueDay })} ·{" "}
                    {tpl(t.creditCards.linkedExpensesLabel, { count: linkedCount })}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(card)}
                    className="text-xs px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 transition-colors"
                    aria-label={t.creditCards.editButton}
                  >
                    ✏
                  </button>
                  <button
                    onClick={() => handleDelete(card)}
                    className="text-xs px-2 py-1 rounded border border-red-700 hover:bg-red-900 text-red-400 transition-colors"
                    aria-label={t.creditCards.deleteButton}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="px-4 py-3 text-sm text-red-400">{error}</p>}

      {showForm && (
        <ModalBackdrop onClose={closeForm} panelClassName="max-w-lg">
          <div className={`w-full p-6 ${bg}`}>
            <h3 className="text-lg font-bold mb-4">
              {editId ? t.creditCards.editTitle : t.creditCards.addTitle}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.creditCards.nameLabel}</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t.creditCards.namePlaceholder}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.creditCards.statementDayLabel}</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={inputCls}
                    value={form.statementDay}
                    onChange={(e) => setForm({ ...form, statementDay: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.creditCards.dueDayLabel}</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={inputCls}
                    value={form.dueDay}
                    onChange={(e) => setForm({ ...form, dueDay: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  {t.creditCards.cancelButton}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? t.creditCards.savingLabel : t.creditCards.saveButton}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
};

export default CreditCardManager;
