import React from "react";
import { Subscription } from "./google-sheets-service";
import { parseDate } from "./date-utils";

interface SubscriptionDetailProps {
  subscription: Subscription;
  position: { x: number; y: number };
  isDarkMode: boolean;
  userLocale: string;
  calculateTotalSpent: (subscription: Subscription) => string;
  positionType?: "hover" | "click"; // New prop to differentiate between hover and click positioning
  onClose?: () => void;
}

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({
  subscription,
  position,
  isDarkMode,
  userLocale,
  calculateTotalSpent,
  positionType = "hover", // Default to hover behavior for backward compatibility
  onClose,
}) => {
  if (!subscription) {
    return null;
  }

  // Calculate next payment date based on frequency
  const getNextPaymentDate = (sub: Subscription): Date => {
    // Start with today's date
    const today = new Date();

    // Parse the start date properly
    const startDate = parseDate(sub.startDate, userLocale);
    console.log(`Calculating next payment for subscription ${sub.name}:`);
    console.log(`- Start date: ${startDate.toISOString()}`);
    console.log(`- Frequency: ${sub.frequency}`);
    console.log(`- Day of month: ${sub.dayOfMonth}`);

    // Create result date
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

    console.log(`- Next payment: ${result.toISOString()}`);
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
        border: `2px solid ${subscription.color}`,
        transform: transform,
      }}
      data-subscription-detail="true"
    >
      {positionType === "click" && onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          aria-label="Close subscription details"
        >
          ✕
        </button>
      )}

      <div className="flex items-center mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
          style={{ backgroundColor: subscription.color }}
        >
          <span className="text-white font-bold text-sm">
            {subscription.logo}
          </span>
        </div>
        <h3 className="text-lg font-bold">{subscription.name}</h3>
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
        <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
          <span>Total spent:</span>
          <span>{calculateTotalSpent(subscription)}</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetail;
