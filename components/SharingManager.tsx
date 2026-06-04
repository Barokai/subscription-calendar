"use client";

import React, { useState } from "react";
import { SubscriptionShare } from "@/lib/shares";
import { useI18n } from "@/lib/i18n";

interface SharingManagerProps {
  shares: SubscriptionShare[];
  isDarkMode: boolean;
  onAdd: (viewerEmail: string) => Promise<void>;
  onRemove: (shareId: string) => Promise<void>;
}

const SharingManager: React.FC<SharingManagerProps> = ({
  shares,
  isDarkMode,
  onAdd,
  onRemove,
}) => {
  const { t, tpl } = useI18n();
  const [viewerEmail, setViewerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white"
      : "bg-gray-50 border-gray-300 text-gray-900"
  }`;

  const addShare = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = viewerEmail.trim().toLowerCase();
    if (!normalized) {
      setError(t.sharing.errorEmailRequired);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onAdd(normalized);
      setViewerEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.sharing.errorSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const removeShare = async (share: SubscriptionShare) => {
    const confirmed = window.confirm(tpl(t.sharing.removeConfirm, { email: share.viewerEmail }));
    if (!confirmed) {
      return;
    }
    try {
      setError(null);
      await onRemove(share.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.sharing.errorDeleteFailed);
    }
  };

  return (
    <div className={`rounded-xl border ${isDarkMode ? "border-gray-700" : "border-gray-200"} ${bg}`}>
      <div className={`px-4 py-3 border-b ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"} rounded-t-xl`}>
        <h2 className="text-base font-semibold">{t.sharing.title}</h2>
        <p className="text-xs text-gray-400 mt-1">{t.sharing.description}</p>
      </div>

      <div className="p-4 space-y-4">
        <form onSubmit={addShare} className="flex flex-col sm:flex-row gap-2">
          <input
            className={inputCls}
            value={viewerEmail}
            onChange={(e) => setViewerEmail(e.target.value)}
            placeholder={t.sharing.emailPlaceholder}
            type="email"
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? t.sharing.savingLabel : t.sharing.addButton}
          </button>
        </form>

        {shares.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{t.sharing.emptyState}</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {shares.map((share) => (
              <div key={share.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{share.viewerEmail}</p>
                  <p className="text-xs text-gray-500">{t.sharing.readOnlyLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeShare(share)}
                  className="text-xs px-2 py-1 rounded border border-red-700 hover:bg-red-900 text-red-400 transition-colors"
                >
                  {t.sharing.removeButton}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default SharingManager;
