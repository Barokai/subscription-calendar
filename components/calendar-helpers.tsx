import React from "react";
import { Subscription } from "@/lib/subscriptions";
import { Income } from "@/lib/incomes";
import { isPaymentInMonth } from "@/lib/frequency-utils";
import styles from "../styles/calendar.module.css";
import { parseDate } from "./date-utils";
import { renderSubscriptionIcon } from "./icon-utils";
import { useI18n } from "@/lib/i18n";

// Maximum number of subscriptions to show before "show more" button
const MAX_VISIBLE_ICONS = 2;

export const getSubscriptionsForDay = (
  day: number,
  subscriptions: Subscription[],
  userLocale: string,
  currentMonth: number,
  currentYear: number
): Subscription[] => {
  return subscriptions.filter((sub) => {
    if (sub.dayOfMonth !== day) { return false; }
    const startDate = parseDate(sub.startDate, userLocale);
    return isPaymentInMonth(sub.frequency, startDate, currentMonth, currentYear);
  });
};

export const getIncomesForDay = (
  day: number,
  incomes: Income[],
  userLocale: string,
  currentMonth: number,
  currentYear: number
): Income[] => {
  return incomes.filter((inc) => {
    if (inc.dayOfMonth !== day) return false;
    const start = parseDate(inc.startDate, userLocale);
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    if (currentYear < startYear || (currentYear === startYear && currentMonth < startMonth)) return false;
    if (inc.endDate) {
      const end = parseDate(inc.endDate, userLocale);
      if (currentYear > end.getFullYear() || (currentYear === end.getFullYear() && currentMonth > end.getMonth())) return false;
    }
    return true;
  });
};

/**
 * Renders subscription and income icons with separate rows and "show more" functionality
 */
export const DayIcons: React.FC<{
  daySubscriptions: Subscription[];
  dayIncomes: Income[];
  expandedDays: Set<string>;
  dayKey: string;
  handleSubscriptionHover: (
    subscription: Subscription,
    event: React.MouseEvent
  ) => void;
  handleSubscriptionLeave: () => void;
  handleSubscriptionClick: (
    subscription: Subscription,
    event: React.MouseEvent
  ) => void;
  handleSubscriptionDragStart: (
    subscription: Subscription,
    event: React.DragEvent<HTMLDivElement>
  ) => void;
  handleSubscriptionDragEnd: () => void;
  isSubscriptionEditable: (subscription: Subscription) => boolean;
  readOnlySuffixLabel: string;
  toggleDayExpansion: (dayKey: string) => void;
}> = ({
  daySubscriptions,
  dayIncomes,
  expandedDays,
  dayKey,
  handleSubscriptionHover,
  handleSubscriptionLeave,
  handleSubscriptionClick,
  handleSubscriptionDragStart,
  handleSubscriptionDragEnd,
  isSubscriptionEditable,
  readOnlySuffixLabel,
  toggleDayExpansion,
}) => {
  const { t, tpl } = useI18n();
  const isExpanded = expandedDays.has(dayKey);

  const hasMoreSubscriptions = daySubscriptions.length > MAX_VISIBLE_ICONS;
  const visibleSubscriptions = isExpanded
    ? daySubscriptions
    : daySubscriptions.slice(0, MAX_VISIBLE_ICONS);
  const hiddenSubCount = daySubscriptions.length - MAX_VISIBLE_ICONS;

  const hasMoreIncomes = dayIncomes.length > MAX_VISIBLE_ICONS;
  const visibleIncomes = isExpanded
    ? dayIncomes
    : dayIncomes.slice(0, MAX_VISIBLE_ICONS);
  const hiddenIncomeCount = dayIncomes.length - MAX_VISIBLE_ICONS;

  if (daySubscriptions.length === 0 && dayIncomes.length === 0) {
    return null;
  }

  return (
    <>
      {daySubscriptions.length > 0 && (
        <div className={styles.subscriptionsContainer}>
          <div className="inline-flex items-center">
            {visibleSubscriptions.map((subscription) => {
              const isEditable = isSubscriptionEditable(subscription);
              return (
                <div
                  key={subscription.id}
                  data-subscription-icon="true"
                  draggable={isEditable}
                  onMouseEnter={(e) => handleSubscriptionHover(subscription, e)}
                  onMouseLeave={handleSubscriptionLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscriptionClick(subscription, e);
                  }}
                  onDragStart={(e) => {
                    if (!isEditable) return;
                    e.stopPropagation();
                    handleSubscriptionDragStart(subscription, e);
                  }}
                  onDragEnd={handleSubscriptionDragEnd}
                  className={`${styles.subscriptionIcon} ${isEditable ? "" : "opacity-70 cursor-default"}`}
                  title={isEditable ? subscription.name : `${subscription.name} (${readOnlySuffixLabel})`}
                >
                  {renderSubscriptionIcon(subscription.name, subscription.color, "w-full h-full")}
                </div>
              );
            })}

            {hasMoreSubscriptions && (
              <div
                data-show-more="true"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDayExpansion(dayKey);
                }}
                className={styles.moreButton}
                title={
                  isExpanded
                    ? t.calendar.collapseDaySubscriptions
                    : tpl(t.calendar.expandDaySubscriptions, { count: hiddenSubCount })
                }
                aria-label={
                  isExpanded
                    ? t.calendar.collapseDaySubscriptions
                    : tpl(t.calendar.expandDaySubscriptions, { count: hiddenSubCount })
                }
              >
                {isExpanded ? `−${hiddenSubCount}` : `+${hiddenSubCount}`}
              </div>
            )}
          </div>
        </div>
      )}

      {dayIncomes.length > 0 && (
        <div className={styles.incomeRow}>
          <div className="inline-flex items-center">
            {visibleIncomes.map((income) => (
              <div
                key={income.id}
                className={styles.subscriptionIcon}
                title={tpl(t.calendar.incomeIconTitle, { name: income.name })}
                onClick={(e) => e.stopPropagation()}
              >
                {renderSubscriptionIcon(income.name, null, "w-full h-full")}
              </div>
            ))}

            {hasMoreIncomes && (
              <div
                data-show-more="true"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDayExpansion(dayKey);
                }}
                className={styles.moreButton}
                title={
                  isExpanded
                    ? t.calendar.collapseDaySubscriptions
                    : tpl(t.calendar.expandDaySubscriptions, { count: hiddenIncomeCount })
                }
                aria-label={
                  isExpanded
                    ? t.calendar.collapseDaySubscriptions
                    : tpl(t.calendar.expandDaySubscriptions, { count: hiddenIncomeCount })
                }
              >
                {isExpanded ? `−${hiddenIncomeCount}` : `+${hiddenIncomeCount}`}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/** @deprecated Use DayIcons instead */
export const SubscriptionIcons = DayIcons;
