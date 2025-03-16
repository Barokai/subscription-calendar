import React from 'react';
import { Subscription } from './google-sheets-service';
import { renderSubscriptionIcon } from './icon-utils';

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
  // Format the date for display
  const displayDate = new Date(year, month, day).toLocaleDateString(userLocale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className={`w-full max-w-md rounded-lg shadow-xl p-4 ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{displayDate}</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3">
          {subscriptions.map(subscription => (
            <div 
              key={subscription.id} 
              className={`p-3 rounded-md ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              } cursor-pointer hover:opacity-90 transition-opacity`}
              onClick={(e) => onSubscriptionClick(subscription, e)}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 mr-3">
                  {renderSubscriptionIcon(subscription.logo, subscription.color, "w-full h-full", isDarkMode)}
                </div>
                <div>
                  <div className="font-medium">{subscription.name}</div>
                  <div className="text-sm opacity-80">
                    {subscription.amount.toLocaleString(userLocale, {
                      style: "currency",
                      currency: subscription.currency.replace("€", "EUR") || "EUR",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DaySubscriptionsOverlay;
