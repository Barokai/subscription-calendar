import React from 'react';

/**
 * Determines if a color is dark (to decide text color for contrast)
 * @param color - The hex color
 * @returns Whether the color is dark
 */
const isColorDark = (color: string): boolean => {
  // Remove the hash if present
  const hex = color.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is dark (luminance < 0.5)
  return luminance < 0.5;
};

/**
 * Renders a subscription icon based on the logo property and color
 * @param logo - The logo file name or icon character
 * @param color - The brand color
 * @param className - Additional CSS classes
 * @param isDarkMode - Whether the UI is in dark mode
 */
export const renderSubscriptionIcon = (
  logo: string, 
  color: string, 
  className?: string,
  isDarkMode: boolean = false
): React.ReactNode => {
  const baseClass = `relative flex items-center justify-center rounded-full overflow-hidden ${className || ''}`;
  
  // Check if the logo is an SVG file path
  if (logo.endsWith('.svg')) {
    // For SVG icons, use a contrasting background
    // In dark mode, use dark gray. In light mode, use white.
    const bgColor = isDarkMode ? '#374151' : '#ffffff';
    
    return (
      <div 
        className={baseClass}
        style={{ 
          backgroundColor: bgColor,     // Use neutral background
          border: `1px solid ${color}`  // Use brand color as border
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-1 z-10">
          <img 
            src={`/icons/subscriptions/${logo}`}
            alt="Subscription logo" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }
  
  // For text-based icons, use the color as background
  const useWhiteText = isColorDark(color);
  
  return (
    <div 
      className={baseClass}
      style={{ backgroundColor: color }}
    >
      <span className={useWhiteText ? 'text-white' : 'text-black'}>
        {logo}
      </span>
    </div>
  );
};
