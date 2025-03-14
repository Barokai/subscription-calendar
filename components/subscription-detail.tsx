import React from "react";
import { Subscription } from "./google-sheets-service";
import { parseDate } from "./date-utils";

interface SubscriptionDetailProps {
  subscription: Subscription;
  position: { x: number; y: number };
  isDarkMode: boolean;
  userLocale: string;
  calculateTotalSpent: (subscription: Subscription) => string;
  positionType?: 'hover' | 'click'; // New prop to differentiate between hover and click positioning
  onClose?: () => void;
}

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({
  subscription,
  position,
  isDarkMode,
  userLocale,
  calculateTotalSpent,
  positionType = 'hover', // Default to hover behavior for backward compatibility
  onClose,
}) => {
  if (!subscription) {
    return null;
  }

  const nextPaymentDate = new Date();
  if (nextPaymentDate.getDate() > subscription.dayOfMonth) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }
  nextPaymentDate.setDate(subscription.dayOfMonth);

  // Parse the start date using our locale-aware function
  const startDate = parseDate(subscription.startDate, userLocale);

  const formattedNextPayment = nextPaymentDate.toLocaleDateString(userLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Format the start date according to user locale
  const formattedStartDate = startDate.toLocaleDateString(userLocale);

  // Determine transform based on position type - moved hover up by 20px
  let transform;
  if (positionType === 'hover') {
    transform = "translate(-50%, calc(-100% - 20px))"; // Position higher above for hover
  } else { // click
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
    >
      {positionType === 'click' && onClose && (
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
          <span>Every {subscription.dayOfMonth}th</span>
          <span>Next: {formattedNextPayment}</span>
        </div>
        <div className="flex justify-between">
          <span>Since {formattedStartDate}</span>
          <span>{calculateTotalSpent(subscription)}</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetail;
