import React, { useRef, useEffect, useState } from 'react';
import { Subscription } from './google-sheets-service';

interface SpendingChartProps {
  subscriptions: Subscription[];
  totalSpend: number;
  userLocale: string;
  isDarkMode: boolean;
  isVisible: boolean;
  onClose: () => void;
}

const SpendingChart: React.FC<SpendingChartProps> = ({
  subscriptions,
  totalSpend,
  userLocale,
  isDarkMode,
  isVisible,
  onClose
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Filter out subscriptions that have 0 amount or would be too small to display
  const validSubscriptions = subscriptions.filter(sub => sub.amount > 0);
  
  // For animation timing and click outside handling
  useEffect(() => {
    // Close chart when clicking outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isVisible) {
      document.addEventListener('click', handleOutsideClick);
      
      // Prevent background scrolling on mobile
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.body.style.overflow = '';
    };
  }, [isVisible, onClose]);
  
  if (!isVisible) return null;
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";
    return amount.toLocaleString(userLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  };

  // Calculate percentages and chart data
  type ChartSegment = {
    subscription: Subscription;
    percentage: number;
    startAngle: number;
    endAngle: number;
    color: string;
  };
  
  const chartSegments: ChartSegment[] = [];
  let cumulativePercentage = 0;
  
  // Sort subscriptions by amount in descending order for better visual representation
  const sortedSubscriptions = [...validSubscriptions].sort((a, b) => b.amount - a.amount);
  
  sortedSubscriptions.forEach(subscription => {
    const percentage = (subscription.amount / totalSpend) * 100;
    const startAngle = (cumulativePercentage / 100) * 360;
    cumulativePercentage += percentage;
    const endAngle = (cumulativePercentage / 100) * 360;
    
    chartSegments.push({
      subscription,
      percentage,
      startAngle,
      endAngle,
      color: subscription.color
    });
  });

  // Function to calculate segment path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number): string => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };
  
  // Convert polar coordinates to Cartesian
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number): { x: number, y: number } => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };
  
  // Calculate midpoint for label positioning
  const getMidpointCoordinates = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number): [number, number] => {
    const midAngle = (startAngle + endAngle) / 2;
    const midpoint = polarToCartesian(centerX, centerY, radius * 0.7, midAngle);
    return [midpoint.x, midpoint.y];
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fadeIn overflow-y-auto p-4">
      <div 
        ref={chartRef}
        className={`relative w-full max-w-md mx-auto p-4 sm:p-6 rounded-2xl shadow-2xl transform transition-all animate-scaleIn ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } ${isMobile ? 'max-h-[90vh] overflow-y-auto' : ''}`}
        style={{ maxHeight: isMobile ? '90vh' : 'auto' }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 sm:mb-4">Monthly Spending</h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">{formatCurrency(totalSpend)}</h3>
        
        <div className="flex justify-center">
          <div className={`relative ${isMobile ? 'w-56 h-56' : 'w-64 h-64'} mb-4 sm:mb-6`}>
            {/* Chart using paths instead of circles for better label placement */}
            <svg 
              className="w-full h-full" 
              viewBox="0 0 100 100" 
              style={{ overflow: 'visible' }}
            >
              {chartSegments.map((segment, i) => {
                // For empty chart or single item
                if (chartSegments.length === 1) {
                  return (
                    <circle
                      key={`segment-${i}`}
                      cx="50"
                      cy="50"
                      r="45"
                      fill={segment.color}
                      className="animate-fadeIn"
                    />
                  );
                }
                
                const path = describeArc(50, 50, 45, segment.startAngle, segment.endAngle);
                const [labelX, labelY] = getMidpointCoordinates(50, 50, 45, segment.startAngle, segment.endAngle);
                const isHighlighted = highlightedSegment === i;
                
                return (
                  <g key={`segment-${i}`}>
                    <path
                      d={path}
                      fill={segment.color}
                      className="animate-fadeIn cursor-pointer hover:opacity-90"
                      style={{ 
                        animation: `fadeIn 0.3s ease-out ${i * 0.1}s forwards`,
                        opacity: 0,
                        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: '50px 50px',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={() => setHighlightedSegment(i)}
                      onMouseLeave={() => setHighlightedSegment(null)}
                    />
                    
                    {/* Only show labels for segments bigger than 8% */}
                    {segment.percentage > 8 && (
                      <g 
                        className="animate-fadeSlideIn"
                        style={{ 
                          animation: `fadeSlideIn 0.5s ease-out ${0.3 + i * 0.1}s forwards`,
                          opacity: 0
                        }}
                      >
                        {/* Background for better readability */}
                        <circle 
                          cx={labelX} 
                          cy={labelY} 
                          r="10" 
                          fill={isDarkMode ? 'rgba(26, 32, 44, 0.8)' : 'rgba(255, 255, 255, 0.8)'} 
                        />
                        {/* Percentage label */}
                        <text 
                          x={labelX} 
                          y={labelY} 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          fill={isDarkMode ? 'white' : 'black'}
                          style={{ fontSize: '6px', fontWeight: 'bold' }}
                        >
                          {Math.round(segment.percentage)}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              
              {/* Central circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="20" 
                fill={isDarkMode ? '#1a202c' : '#f7fafc'} 
                className="animate-scaleIn"
              />
              
              <text 
                x="50" 
                y="46" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="font-bold"
                fill={isDarkMode ? 'white' : 'black'}
                style={{ fontSize: '6px' }}
              >
                Total
              </text>
              
              <text 
                x="50" 
                y="54" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="font-bold"
                fill={isDarkMode ? 'white' : 'black'}
                style={{ fontSize: '5px' }}
              >
                {formatCurrency(totalSpend).replace(/\.00/, '')}
              </text>
            </svg>
          </div>
        </div>
        
        {/* Legend with interactive highlighting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {chartSegments.map((segment, i) => (
            <div 
              key={`legend-${i}`} 
              className={`flex items-center animate-fadeSlideIn p-2 rounded-lg cursor-pointer ${
                highlightedSegment === i ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
              }`}
              style={{ animation: `fadeSlideIn 0.5s ease-out ${0.3 + i * 0.1}s forwards` }}
              onMouseEnter={() => setHighlightedSegment(i)}
              onMouseLeave={() => setHighlightedSegment(null)}
            >
              <div 
                className="w-4 h-4 rounded-full mr-2 flex-shrink-0" 
                style={{ backgroundColor: segment.subscription.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{segment.subscription.name}</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatCurrency(segment.subscription.amount)} ({segment.percentage.toFixed(2)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpendingChart;
