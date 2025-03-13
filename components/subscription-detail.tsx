import React from 'react';

interface SubscriptionDetailProps {
  subscription: any;
  position: { x: number, y: number };
  isDarkMode: boolean;
  userLocale: string;
  calculateTotalSpent: (subscription: any) => string;
}

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({
  subscription,
  position,
  isDarkMode,
  userLocale,
  calculateTotalSpent
}) => {
  if (!subscription) return null;
  
  // Calculate viewport dimensions
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  
  // Calculate position, ensuring the tooltip stays within viewport bounds
  let adjustedX = position.x;
  // Fix horizontal positioning by using a percentage of the viewport width
  // This helps ensure it shows directly above the cursor
  const adjustedPosition = {
    x: Math.min(Math.max(adjustedX, 150), viewportWidth - 150),
    y: position.y - 20 // Slightly above cursor
  };
  
  const nextPaymentDate = new Date();
  if (nextPaymentDate.getDate() > subscription.dayOfMonth) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }
  nextPaymentDate.setDate(subscription.dayOfMonth);
  
  const formattedNextPayment = nextPaymentDate.toLocaleDateString(userLocale, { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  
  return (
    <div 
      className={`fixed z-50 shadow-xl rounded-lg p-4 max-w-xs w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
      style={{ 
        left: `${adjustedPosition.x}px`, 
        top: `${adjustedPosition.y}px`,
        border: `2px solid ${subscription.color}`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" 
          style={{ backgroundColor: subscription.color }}>
          <span className="text-white font-bold text-sm">{subscription.logo}</span>
        </div>
        <h3 className="text-lg font-bold">{subscription.name}</h3>
        <div className="ml-auto text-lg font-bold">
          {subscription.amount.toLocaleString(userLocale, { 
            style: 'currency', 
            currency: subscription.currency.replace('€', 'EUR') || 'EUR' 
          })}
        </div>
      </div>
      
      <div className="space-y-2 mb-2 text-sm">
        <div className="flex justify-between">
          <span>Every {subscription.dayOfMonth}th</span>
          <span>Next: {formattedNextPayment}</span>
        </div>
        <div className="flex justify-between">
          <span>Since {new Date(subscription.startDate).toLocaleDateString(userLocale)}</span>
          <span>{calculateTotalSpent(subscription)}</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetail;
