import React from "react";
import { Subscription } from "./google-sheets-service";
import { isPaymentInMonth } from "./google-sheets-service";
import styles from "../styles/calendar.module.css";
import { parseDate } from "./date-utils";
import { renderSubscriptionIcon } from "./icon-utils";

// Maximum number of subscriptions to show before "show more" button
const MAX_VISIBLE_ICONS = 2;

/**
 * Get subscriptions for a specific day
 */
export const getSubscriptionsForDay = (
  day: number,
  subscriptions: Subscription[],
  userLocale: string,
  currentMonth: number,
  currentYear: number
): Subscription[] => {
  return subscriptions.filter((sub) => {
    // First check if the day matches
    if (sub.dayOfMonth !== day) {
      return false;
    }

    // Then check if this subscription should be shown in this month based on frequency
    const startDate = parseDate(sub.startDate, userLocale);
    return isPaymentInMonth(
      sub.frequency,
      startDate,
      currentMonth,
      currentYear
    );
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
  toggleDayExpansion: (dayKey: string) => void;
  isDarkMode: boolean; // Add isDarkMode prop
}> = ({
  daySubscriptions,
  expandedDays,
  dayKey,
  handleSubscriptionHover,
  handleSubscriptionLeave,
  handleSubscriptionClick,
  toggleDayExpansion,
  isDarkMode,
}) => {
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
            onMouseEnter={(e) => handleSubscriptionHover(subscription, e)}
            onMouseLeave={handleSubscriptionLeave}
            onClick={(e) => {
              e.stopPropagation();
              handleSubscriptionClick(subscription, e);
            }}
            className={styles.subscriptionIcon}
            title={subscription.name}
          >
            {renderSubscriptionIcon(
              subscription.logo,
              subscription.color,
              "w-full h-full",
              isDarkMode
            )}
          </div>
        ))}

        {/* Show more button when needed */}
        {!isExpanded && hasMoreSubscriptions && (
          <div
            data-show-more="true"
            onClick={(e) => {
              e.stopPropagation();
              toggleDayExpansion(dayKey);
            }}
            className={styles.moreButton}
            title={`${hiddenCount} more subscription${
              hiddenCount > 1 ? "s" : ""
            }`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
};
