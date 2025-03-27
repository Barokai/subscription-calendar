// Platform-agnostic business logic for subscription management

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'daily';
  startDate: string; // ISO date string
  endDate?: string; // Optional ISO date string
  category?: string;
  color?: string;
}

/**
 * Calculate the next payment date for a subscription
 */
export function calculateNextPaymentDate(subscription: Subscription): Date {
  const startDate = new Date(subscription.startDate);
  const today = new Date();
  
  if (subscription.endDate && new Date(subscription.endDate) < today) {
    // Subscription has ended
    return new Date(subscription.endDate);
  }
  
  let nextDate = new Date(startDate);
  
  switch (subscription.frequency) {
    case 'daily':
      // Find the next day that's >= today
      while (nextDate < today) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // Find the next week that's >= today
      while (nextDate < today) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
      
    case 'monthly':
      // Find the next month that's >= today
      while (nextDate < today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
      
    case 'yearly':
      // Find the next year that's >= today
      while (nextDate < today) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
  }
  
  return nextDate;
}

/**
 * Group subscriptions by month (for calendar views)
 */
export function groupSubscriptionsByMonth(subscriptions: Subscription[]): Record<string, Subscription[]> {
  const grouped: Record<string, Subscription[]> = {};
  
  // Get current date for calculating next payment dates
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Look at the next 12 months
  for (let i = 0; i < 12; i++) {
    const month = (currentMonth + i) % 12;
    const year = currentYear + Math.floor((currentMonth + i) / 12);
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    grouped[monthKey] = [];
  }
  
  // Place each subscription in the appropriate month(s)
  subscriptions.forEach(subscription => {
    if (subscription.endDate && new Date(subscription.endDate) < today) {
      // Skip expired subscriptions
      return;
    }
    
    const nextPaymentDate = calculateNextPaymentDate(subscription);
    const monthKey = `${nextPaymentDate.getFullYear()}-${String(nextPaymentDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (grouped[monthKey]) {
      grouped[monthKey].push(subscription);
    }
    
    // For monthly and yearly subscriptions, project future payments as well
    if (subscription.frequency === 'monthly' || subscription.frequency === 'yearly') {
      let futureDate = new Date(nextPaymentDate);
      
      // Add the next 11 occurrences for projecting future costs
      for (let i = 1; i < 12; i++) {
        if (subscription.frequency === 'monthly') {
          futureDate = new Date(futureDate.setMonth(futureDate.getMonth() + 1));
        } else {
          futureDate = new Date(futureDate.setFullYear(futureDate.getFullYear() + 1));
        }
        
        // Check if subscription ends before this payment
        if (subscription.endDate && new Date(subscription.endDate) < futureDate) {
          break;
        }
        
        const futureMonthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        if (grouped[futureMonthKey]) {
          grouped[futureMonthKey].push({...subscription, isProjected: true});
        }
      }
    }
  });
  
  return grouped;
}

/**
 * Calculate total spending across all subscriptions
 */
export function calculateTotalSpending(subscriptions: Subscription[]): Record<string, number> {
  const result = {
    monthly: 0,
    yearly: 0,
    total: 0
  };
  
  subscriptions.forEach(subscription => {
    // Skip expired subscriptions
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return;
    }
    
    const amount = subscription.amount;
    
    switch (subscription.frequency) {
      case 'daily':
        result.monthly += amount * 30; // Approximate days per month
        result.yearly += amount * 365;
        break;
        
      case 'weekly':
        result.monthly += amount * 4.33; // Approximate weeks per month
        result.yearly += amount * 52;
        break;
        
      case 'monthly':
        result.monthly += amount;
        result.yearly += amount * 12;
        break;
        
      case 'yearly':
        result.monthly += amount / 12;
        result.yearly += amount;
        break;
    }
  });
  
  result.total = result.yearly; // Total is yearly sum
  
  return result;
}
