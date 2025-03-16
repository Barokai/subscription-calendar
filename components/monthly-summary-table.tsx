import React from 'react';
import { Subscription, isPaymentInMonth } from './google-sheets-service';
import { parseDate } from './date-utils';

interface MonthlySummaryTableProps {
  subscriptions: Subscription[];
  month: number;
  year: number;
  userLocale: string;
  isDarkMode: boolean;
  onSubscriptionClick: (subscription: Subscription, event: React.MouseEvent) => void;
}

const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({
  subscriptions,
  month,
  year,
  userLocale,
  isDarkMode,
  onSubscriptionClick,
}) => {
  // Group subscriptions by day of month, filtering by frequency
  const subscriptionsByDay: Record<number, Subscription[]> = {};
  
  // Initialize all days of the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    subscriptionsByDay[day] = [];
  }
  
  // Populate with actual subscriptions that should appear in this month
  subscriptions.forEach(subscription => {
    if (subscription.dayOfMonth <= daysInMonth) {
      // Check if this subscription should be shown based on frequency
      const startDate = parseDate(subscription.startDate, userLocale);
      if (isPaymentInMonth(subscription.frequency, startDate, month, year)) {
        subscriptionsByDay[subscription.dayOfMonth].push(subscription);
      }
    }
  });
  
  // Calculate daily totals - using actual amounts, not monthly equivalents
  const dailyTotals: Record<number, number> = {};
  Object.entries(subscriptionsByDay).forEach(([day, subs]) => {
    dailyTotals[Number(day)] = subs.reduce((sum, sub) => sum + sub.amount, 0);
  });
  
  // Get currency for formatting
  const currency = subscriptions.length > 0 
    ? subscriptions[0].currency.replace("€", "EUR") 
    : "USD";
  
  // Format currency amount
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString(userLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };
  
  // Filter to only show days with subscriptions
  const activeDays = Object.entries(subscriptionsByDay)
    .filter(([_, subs]) => subs.length > 0)
    .map(([day, _]) => Number(day))
    .sort((a, b) => a - b);
  
  return (
    <div className={`mt-6 rounded-lg overflow-hidden border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      <h2 className={`text-lg font-semibold p-3 ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        Monthly Summary
      </h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className={`${
            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
          }`}>
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">
                Day
              </th>
              <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">
                Subscriptions
              </th>
              <th className="py-2 px-3 text-right text-xs font-medium uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className={`${isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
            {activeDays.length > 0 ? (
              activeDays.map(day => (
                <tr key={day} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                  <td className="py-3 px-3 whitespace-nowrap text-sm font-medium">
                    {day}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {subscriptionsByDay[day].map(subscription => (
                        <div
                          key={subscription.id}
                          data-subscription-icon="true"
                          onClick={(e: React.MouseEvent) => onSubscriptionClick(subscription, e)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: subscription.color }}
                          title={subscription.name}
                        >
                          {subscription.logo}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-sm font-medium text-right">
                    {formatCurrency(dailyTotals[day])}
                  </td>
                </tr>
              ))
            ) : (
              <tr className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                <td colSpan={3} className="py-3 px-3 text-center text-sm italic">
                  No subscriptions this month
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className={`${
            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
          }`}>
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium" colSpan={2}>
                Monthly Total
              </th>
              <th className="py-2 px-3 text-right text-xs font-medium">
                {formatCurrency(
                  Object.values(dailyTotals).reduce((sum, amount) => sum + amount, 0)
                )}
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MonthlySummaryTable;
