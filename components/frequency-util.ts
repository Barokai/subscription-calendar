/**
 * Utility functions for handling subscription frequencies
 */

/**
 * Get a human-readable description of payment frequency
 */
export const getFrequencyDescription = (
  frequency: string, 
  amount: number, 
  monthlyEquivalent: number, 
  userLocale: string,
  currency: string
): string => {
  const formattedAmount = amount.toLocaleString(userLocale, {
    style: 'currency',
    currency: currency.replace("€", "EUR") || "EUR",
  });
  
  const formattedMonthly = monthlyEquivalent.toLocaleString(userLocale, {
    style: 'currency',
    currency: currency.replace("€", "EUR") || "EUR",
  });
  
  switch (frequency.toLowerCase()) {
    case 'yearly':
    case 'annual':
    case 'annually':
      return `${formattedAmount} per year (${formattedMonthly}/mo)`;
      
    case 'quarterly':
    case 'quarter':
      return `${formattedAmount} every 3 months (${formattedMonthly}/mo)`;
      
    case 'biannually':
    case 'semi-annually':
    case 'half-yearly':
      return `${formattedAmount} every 6 months (${formattedMonthly}/mo)`;
      
    case 'weekly':
      return `${formattedAmount} weekly (${formattedMonthly}/mo)`;
      
    case 'biweekly':
    case 'bi-weekly':
    case 'fortnightly':
      return `${formattedAmount} every 2 weeks (${formattedMonthly}/mo)`;
      
    case 'daily':
      return `${formattedAmount} daily (${formattedMonthly}/mo)`;
      
    case 'monthly':
    default:
      return `${formattedAmount} monthly`;
  }
};

/**
 * Calculate number of payments since start date based on frequency
 */
export const getPaymentsSinceStart = (
  startDate: Date,
  currentDate: Date,
  frequency: string
): number => {
  const monthsDiff = monthsBetweenDates(startDate, currentDate);
  
  switch (frequency.toLowerCase()) {
    case 'yearly':
    case 'annual':
    case 'annually':
      return Math.floor(monthsDiff / 12);
      
    case 'quarterly':
    case 'quarter':
      return Math.floor(monthsDiff / 3);
      
    case 'biannually':
    case 'semi-annually':
    case 'half-yearly':
      return Math.floor(monthsDiff / 6);
      
    case 'weekly':
      return Math.floor(monthsDiff * 4.33); // Average weeks in a month
      
    case 'biweekly':
    case 'bi-weekly':
    case 'fortnightly':
      return Math.floor(monthsDiff * 2.17); // Average bi-weeks in a month
      
    case 'daily':
      return Math.floor(monthsDiff * 30.42); // Average days in a month
      
    case 'monthly':
    default:
      return Math.floor(monthsDiff);
  }
};

/**
 * Helper function to calculate months between dates
 */
const monthsBetweenDates = (startDate: Date, endDate: Date): number => {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  
  // Add partial month based on day difference
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const daysInEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
  
  const partialMonth = (endDay - startDay) / daysInEndMonth;
  
  return years * 12 + months + partialMonth;
};
