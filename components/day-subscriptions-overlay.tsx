import React from 'react';
import { Subscription } from './google-sheets-service';

interface DaySubscriptionsOverlayProps {
  day: number;
  month: number;
  year: number;
  subscriptions: Subscription[];
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
  userLocale,
  isDarkMode,
  onClose,
  onSubscriptionClick
}) => {
  // Format the date
  const formattedDate = new Date(year, month, day).toLocaleDateString(
    userLocale,
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  // Format currency for totals
  const formatCurrency = (amount: number): string => {
    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";
    return amount.toLocaleString(userLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Calculate total for the day
  const dailyTotal = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`relative w-full max-w-md rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } p-4 max-h-[90vh] overflow-auto`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-500"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-4">{formattedDate}</h2>
        
        <div className="space-y-3">
          {subscriptions.map(subscription => (
            <div 
              key={subscription.id}
              className={`p-3 rounded-lg flex items-center cursor-pointer ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={(e) => onSubscriptionClick(subscription, e)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold mr-4"
                style={{ backgroundColor: subscription.color }}
              >
                {subscription.logo}
              </div>
              
              <div className="flex-grow">
                <div className="font-semibold">{subscription.name}</div>
                <div className="text-sm text-gray-400">
                  {subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)}
                </div>
              </div>
              
              <div className="text-lg font-bold">
                {formatCurrency(subscription.amount)}
              </div>
            </div>
          ))}
        </div>
        
        {subscriptions.length > 1 && (
          <div className="border-t mt-4 pt-3 flex justify-between items-center">
            <span className="font-medium">Total for {day}</span>
            <span className="text-xl font-bold">{formatCurrency(dailyTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DaySubscriptionsOverlay;
