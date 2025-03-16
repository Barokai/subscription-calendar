import React from 'react';
import { Subscription, isPaymentInMonth } from './google-sheets-service';
import { parseDate } from './date-utils';

interface SubscriptionTrendsProps {
  subscriptions: Subscription[];
  userLocale: string;
  isDarkMode: boolean;
  lastFetchTime?: Date;
  currentMonth: number;
  currentYear: number;
}

const SubscriptionTrends: React.FC<SubscriptionTrendsProps> = ({
  subscriptions,
  userLocale,
  isDarkMode,
  lastFetchTime,
  currentMonth,
  currentYear,
}) => {
  // Get currency for formatting
  const currency = subscriptions.length > 0 
    ? subscriptions[0].currency.replace("€", "EUR") 
    : "USD";
  
  // Calculate monthly total that includes only the subscriptions for that month
  const calculateMonthlyTotal = (month: number, year: number): number => {
    if (subscriptions.length === 0) return 0;
    
    return subscriptions.reduce((sum, sub) => {
      const startDate = parseDate(sub.startDate, userLocale);
      const shouldInclude = isPaymentInMonth(sub.frequency, startDate, month, year);
      return sum + (shouldInclude ? sub.amount : 0);
    }, 0);
  };
  
  // Get previous month
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  // Get next month
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  
  // Calculate totals
  const prevMonthTotal = calculateMonthlyTotal(prevMonth, prevYear);
  const currentMonthTotal = calculateMonthlyTotal(currentMonth, currentYear);
  const nextMonthTotal = calculateMonthlyTotal(nextMonth, nextYear);
  
  // Calculate change percentages
  const prevToCurrentChange = prevMonthTotal === 0 
    ? 100 
    : ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    
  const currentToNextChange = currentMonthTotal === 0 
    ? 0 
    : ((nextMonthTotal - currentMonthTotal) / currentMonthTotal) * 100;
  
  // Format currency amount
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString(userLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  
  // Format month name
  const getMonthName = (month: number, year: number): string => {
    return new Date(year, month).toLocaleString(userLocale, { month: 'short' });
  };
  
  // Get change indicator
  const getChangeIndicator = (change: number) => {
    if (change === 0) return '•';
    if (change > 0) return '▲';
    return '▼';
  };
  
  // Get change class
  const getChangeClass = (change: number) => {
    if (change === 0) return 'text-gray-500';
    if (change > 0) return 'text-red-500';
    return 'text-green-500';
  };
  
  return (
    <div className={`mt-6 rounded-lg overflow-hidden border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      <h2 className={`text-lg font-semibold p-3 flex justify-between items-center ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <span>Spending Trends</span>
        {lastFetchTime && (
          <span className="text-xs text-gray-500">
            Updated: {lastFetchTime.toLocaleString(userLocale)}
          </span>
        )}
      </h2>
      
      <div className={`grid grid-cols-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Previous Month */}
        <div className="p-4 text-center border-r border-gray-700">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
            {getMonthName(prevMonth, prevYear)}
          </div>
          <div className="text-lg font-bold">
            {formatCurrency(prevMonthTotal)}
          </div>
        </div>
        
        {/* Current Month */}
        <div className="p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
            {getMonthName(currentMonth, currentYear)}
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(currentMonthTotal)}
          </div>
          <div className={`text-xs ${getChangeClass(prevToCurrentChange)}`}>
            {getChangeIndicator(prevToCurrentChange)} {Math.abs(prevToCurrentChange).toFixed(1)}%
          </div>
        </div>
        
        {/* Next Month (Projected) */}
        <div className="p-4 text-center border-l border-gray-700">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
            {getMonthName(nextMonth, nextYear)} (Projected)
          </div>
          <div className="text-lg font-bold">
            {formatCurrency(nextMonthTotal)}
          </div>
          <div className={`text-xs ${getChangeClass(currentToNextChange)}`}>
            {getChangeIndicator(currentToNextChange)} {Math.abs(currentToNextChange).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTrends;
