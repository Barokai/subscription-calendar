import React from 'react';
import { Subscription } from '@/lib/subscriptions';
import { Income } from '@/lib/incomes';
import { renderSubscriptionIcon } from './icon-utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useI18n } from '@/lib/i18n';

interface DaySubscriptionsOverlayProps {
  day: number;
  month: number;
  year: number;
  subscriptions: Subscription[];
  incomes: Income[];
  userLocale: string;
  isDarkMode: boolean;
  onClose: () => void;
  onSubscriptionClick: (subscription: Subscription, event: React.MouseEvent) => void;
}

const DaySubscriptionsOverlay: React.FC<DaySubscriptionsOverlayProps> = ({
  day,
  month,
  year,
  subscriptions,
  incomes,
  userLocale,
  isDarkMode,
  onClose,
  onSubscriptionClick,
}) => {
  const { t } = useI18n();
  useEscapeKey(onClose, true);

  const displayDate = new Date(year, month, day).toLocaleDateString(userLocale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const expenseTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);
  const incomeTotal = incomes.reduce((s, inc) => s + inc.amount, 0);
  const fmtAmt = (n: number, currency: string) =>
    n.toLocaleString(userLocale, { style: 'currency', currency: currency.replace('€', 'EUR') || 'EUR' });
  const expenseCurrency = subscriptions[0]?.currency ?? 'EUR';
  const incomeCurrency = incomes[0]?.currency ?? 'EUR';

  const panelBg = isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800';
  const rowBg   = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';
  const labelCls = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
      data-component="day-subscriptions-overlay"
    >
      <div
        className={`w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col ${panelBg}`}
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-700/30 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate">{displayDate}</h3>
            <div className="flex gap-3 mt-0.5">
              {expenseTotal > 0 && (
                <span className="text-xs font-medium text-red-400">
                  −{fmtAmt(expenseTotal, expenseCurrency)}
                </span>
              )}
              {incomeTotal > 0 && (
                <span className="text-xs font-medium text-green-400">
                  +{fmtAmt(incomeTotal, incomeCurrency)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-600/40 transition-colors"
            aria-label={t.overlay.closeButton}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">

          {/* Expenses section */}
          {subscriptions.length > 0 && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${labelCls}`}>
                {t.overlay.expensesLabel}
              </p>
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className={`p-3 rounded-lg ${rowBg} cursor-pointer hover:opacity-90 transition-opacity`}
                    onClick={(e) => { onClose(); onSubscriptionClick(sub, e); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0">
                        {renderSubscriptionIcon(sub.name, sub.color, 'w-full h-full')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{sub.name}</div>
                        <div className={`text-sm ${labelCls}`}>
                          {sub.amount.toLocaleString(userLocale, {
                            style: 'currency',
                            currency: sub.currency.replace('€', 'EUR') || 'EUR',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income section */}
          {incomes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-green-400">
                {t.overlay.incomeLabel}
              </p>
              <div className="space-y-2">
                {incomes.map((inc) => (
                  <div
                    key={inc.id}
                    className={`p-3 rounded-lg ${rowBg}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0">
                        {renderSubscriptionIcon(inc.name, null, 'w-full h-full')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{inc.name}</div>
                        <div className="text-sm text-green-400">
                          +{inc.amount.toLocaleString(userLocale, {
                            style: 'currency',
                            currency: inc.currency.replace('€', 'EUR') || 'EUR',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DaySubscriptionsOverlay;
