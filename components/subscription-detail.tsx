import React from "react";
import { Subscription } from "@/lib/subscriptions";
import { parseDate } from "./date-utils";
import { renderSubscriptionIcon } from "./icon-utils";
import { getServiceColor } from "@/lib/icons";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useI18n } from "@/lib/i18n";

interface SubscriptionDetailProps {
  subscription: Subscription;
  position: { x: number; y: number };
  isDarkMode: boolean;
  userLocale: string;
  calculateTotalSpent: (subscription: Subscription) => string;
  positionType?: "hover" | "click";
  onClose?: () => void;
  onEdit?: (sub: Subscription) => void;
  onDelete?: (id: string) => void;
  readOnlyLabel?: string;
}

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({
  subscription,
  position,
  isDarkMode,
  userLocale,
  calculateTotalSpent,
  positionType = "hover",
  onClose,
  onEdit,
  onDelete,
  readOnlyLabel,
}) => {
  const { t } = useI18n();
  useEscapeKey(onClose ?? (() => {}), positionType === "click" && !!onClose);

  if (!subscription) {
    return null;
  }

  // Calculate next payment date based on frequency
  const getNextPaymentDate = (sub: Subscription): Date => {
    // Start with today's date
    const today = new Date();

    const startDate = parseDate(sub.startDate, userLocale);
    const result = new Date();

    // Set the day of month first (to handle different months properly)
    result.setDate(sub.dayOfMonth);

    switch (sub.frequency.toLowerCase()) {
      case "yearly":
        // For yearly, we need the same month as the start date
        const startMonth = startDate.getMonth();
        result.setMonth(startMonth);

        // Now determine if we need this year or next year
        if (
          result.getMonth() < today.getMonth() ||
          (result.getMonth() === today.getMonth() &&
            result.getDate() < today.getDate())
        ) {
          // If the date has already passed this year, move to next year
          result.setFullYear(today.getFullYear() + 1);
        } else {
          // Otherwise stay in current year
          result.setFullYear(today.getFullYear());
        }
        break;

      case "quarterly":
        // Calculate next quarter date from start date
        const startQuarterMonth = startDate.getMonth() % 3; // 0, 1, or 2 (position within quarter)
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const currentMonthInQuarter = today.getMonth() % 3;

        // If we're past the relative month or at the same month but past the day
        let nextQuarterMonth;
        if (
          currentMonthInQuarter > startQuarterMonth ||
          (currentMonthInQuarter === startQuarterMonth &&
            today.getDate() > sub.dayOfMonth)
        ) {
          // Move to next quarter
          nextQuarterMonth = (currentQuarter + 1) * 3 + startQuarterMonth;
        } else {
          // Stay in current quarter
          nextQuarterMonth = currentQuarter * 3 + startQuarterMonth;
        }

        // Handle year change
        const yearAdjustment = Math.floor(nextQuarterMonth / 12);
        result.setMonth(nextQuarterMonth % 12);
        result.setFullYear(today.getFullYear() + yearAdjustment);
        break;

      case "biannually":
        // Calculate next half-year date
        const startBiMonth = startDate.getMonth() % 6; // 0-5 (position within half-year)
        const currentHalf = Math.floor(today.getMonth() / 6);
        const currentMonthInHalf = today.getMonth() % 6;

        // If we're past the relative month or at the same month but past the day
        let nextHalfMonth;
        if (
          currentMonthInHalf > startBiMonth ||
          (currentMonthInHalf === startBiMonth &&
            today.getDate() > sub.dayOfMonth)
        ) {
          // Move to next half-year
          nextHalfMonth = (currentHalf + 1) * 6 + startBiMonth;
        } else {
          // Stay in current half
          nextHalfMonth = currentHalf * 6 + startBiMonth;
        }

        // Handle year change
        const biYearAdjustment = Math.floor(nextHalfMonth / 12);
        result.setMonth(nextHalfMonth % 12);
        result.setFullYear(today.getFullYear() + biYearAdjustment);
        break;

      default: // monthly, etc.
        if (result.getDate() <= today.getDate()) {
          // If day has passed already, move to next month
          result.setMonth(today.getMonth() + 1);
        } else {
          // Otherwise stay in current month
          result.setMonth(today.getMonth());
        }
    }

    return result;
  };

  const nextPaymentDate = getNextPaymentDate(subscription);

  // Parse the start date using our locale-aware function
  const startDate = parseDate(subscription.startDate, userLocale);

  const formattedNextPayment = nextPaymentDate.toLocaleDateString(userLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Format the start date according to user locale
  const formattedStartDate = startDate.toLocaleDateString(userLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Format frequency for display
  const formatFrequency = (frequency: string): string => {
    const capitalizedFrequency =
      frequency.charAt(0).toUpperCase() + frequency.slice(1);
    return capitalizedFrequency;
  };

  // Determine transform based on position type - moved hover up by 20px
  let transform;
  if (positionType === "hover") {
    transform = "translate(-50%, calc(-100% - 20px))"; // Position higher above for hover
  } else {
    // click
    transform = "translate(-50%, -120%)"; // Default to above for click too
  }

  return (
    <div
      className={`fixed z-50 shadow-xl rounded-lg p-4 max-w-xs w-full ${
        isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        border: `2px solid #${getServiceColor(subscription.name, subscription.color)}`,
        transform: transform,
      }}
      data-subscription-detail="true"
    >
      {positionType === "click" && onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          aria-label={t.overlay.closeButton}
        >
          ✕
        </button>
      )}

      <div className="flex items-center mb-4">
        <div className="w-8 h-8 mr-3">
          {renderSubscriptionIcon(subscription.name, subscription.color, "w-full h-full")}
        </div>
        <h3 className="text-lg font-bold">{subscription.name}</h3>
        {readOnlyLabel && (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-400 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 rounded">
            {readOnlyLabel}
          </span>
        )}
        <div className="ml-auto text-lg font-bold">
          {subscription.amount.toLocaleString(userLocale, {
            style: "currency",
            currency: subscription.currency.replace("€", "EUR") || "EUR",
          })}
        </div>
      </div>

      <div className="space-y-2 mb-2 text-sm">
        <div className="flex justify-between">
          <span>
            Every {subscription.dayOfMonth}
            {subscription.dayOfMonth === 1
              ? "st"
              : subscription.dayOfMonth === 2
              ? "nd"
              : subscription.dayOfMonth === 3
              ? "rd"
              : subscription.dayOfMonth >= 21 &&
                subscription.dayOfMonth % 10 === 1
              ? "st"
              : subscription.dayOfMonth >= 22 &&
                subscription.dayOfMonth % 10 === 2
              ? "nd"
              : subscription.dayOfMonth >= 23 &&
                subscription.dayOfMonth % 10 === 3
              ? "rd"
              : "th"}
          </span>
          <span>Frequency: {formatFrequency(subscription.frequency || "monthly")}</span>
        </div>
        <div className="flex justify-between">
          <span>Next: {formattedNextPayment}</span>
          <span>Since {formattedStartDate}</span>
        </div>
        {subscription.category && (
          <div className="flex justify-between">
            <span>Category:</span>
            <span className="text-gray-400">{subscription.category}</span>
          </div>
        )}
        <div
          className="flex justify-between border-t pt-1 mt-1"
          style={{ borderColor: `#${getServiceColor(subscription.name, subscription.color)}40` }}
        >
          <span>Total spent:</span>
          <span>{calculateTotalSpent(subscription)}</span>
        </div>
      </div>

      {positionType === "click" && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-700">
          {onEdit && (
            <button
              onClick={() => onEdit(subscription)}
              className="flex-1 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete "${subscription.name}"?`)) { onDelete(subscription.id); }
              }}
              className="flex-1 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionDetail;
