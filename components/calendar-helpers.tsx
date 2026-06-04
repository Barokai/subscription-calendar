import React from "react";
import { Subscription } from "@/lib/subscriptions";
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

/**
 * Renders subscription icons with "show more" functionality
 */
export const SubscriptionIcons: React.FC<{
  daySubscriptions: Subscription[];
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
  toggleDayExpansion: (dayKey: string) => void;
}> = ({
  daySubscriptions,
  expandedDays,
  dayKey,
  handleSubscriptionHover,
  handleSubscriptionLeave,
  handleSubscriptionClick,
  handleSubscriptionDragStart,
  handleSubscriptionDragEnd,
  toggleDayExpansion,
}) => {
  const { t, tpl } = useI18n();
  const isExpanded = expandedDays.has(dayKey);
  const hasMoreSubscriptions = daySubscriptions.length > MAX_VISIBLE_ICONS;

  // Decide which subscriptions to show based on expansion state
  const visibleSubscriptions = isExpanded
    ? daySubscriptions
    : daySubscriptions.slice(0, MAX_VISIBLE_ICONS);

  // How many additional subscriptions are hidden
  const hiddenCount = daySubscriptions.length - MAX_VISIBLE_ICONS;

  if (daySubscriptions.length === 0) {
    return null;
  }

  return (
    <div className={styles.subscriptionsContainer}>
      {/* Create a centered wrapper div for the icons group */}
      <div className="inline-flex items-center">
        {visibleSubscriptions.map((subscription) => (
          <div
            key={subscription.id}
            data-subscription-icon="true"
            draggable
            onMouseEnter={(e) => handleSubscriptionHover(subscription, e)}
            onMouseLeave={handleSubscriptionLeave}
            onClick={(e) => {
              e.stopPropagation();
              handleSubscriptionClick(subscription, e);
            }}
            onDragStart={(e) => {
              e.stopPropagation();
              handleSubscriptionDragStart(subscription, e);
            }}
            onDragEnd={handleSubscriptionDragEnd}
            className={styles.subscriptionIcon}
            title={subscription.name}
          >
            {renderSubscriptionIcon(
              subscription.name,
              subscription.color,
              "w-full h-full"
            )}
          </div>
        ))}

        {/* Toggle expansion when there are hidden subscriptions */}
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
                : tpl(t.calendar.expandDaySubscriptions, { count: hiddenCount })
            }
            aria-label={
              isExpanded
                ? t.calendar.collapseDaySubscriptions
                : tpl(t.calendar.expandDaySubscriptions, { count: hiddenCount })
            }
          >
            {isExpanded ? `−${hiddenCount}` : `+${hiddenCount}`}
          </div>
        )}
      </div>
    </div>
  );
};
