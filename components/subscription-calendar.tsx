import React, { useState, useEffect, useCallback, useRef } from 'react';
import SetupInstructions from './setup-instructions';
import SubscriptionDetail from './subscription-detail';
import { loadSettings, saveSettings as saveSettingsToStorage, isConnected as checkConnection } from './settings-service';

const SubscriptionCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setupVisible, setSetupVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userLocale, setUserLocale] = useState('en-US');
  const [isConnected, setIsConnected] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoveredSubscription, setHoveredSubscription] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const hoverTimeoutRef = useRef(null);
  
  // Mock data for initial display
  const mockData = [
    {
      id: 1,
      name: 'Netflix',
      amount: 4.33,
      currency: '€',
      frequency: 'monthly',
      dayOfMonth: 7,
      color: '#E50914',
      logo: 'N',
      startDate: '2021-01-01'
    },
    {
      id: 2,
      name: 'Spotify',
      amount: 9.99,
      currency: '€',
      frequency: 'monthly',
      dayOfMonth: 12,
      color: '#1DB954',
      logo: 'S',
      startDate: '2022-03-15'
    },
    {
      id: 3,
      name: 'Amazon Prime',
      amount: 7.99,
      currency: '€',
      frequency: 'monthly',
      dayOfMonth: 30,
      color: '#FF9900',
      logo: 'a',
      startDate: '2021-11-20'
    },
    {
      id: 4,
      name: 'LinkedIn',
      amount: 29.99,
      currency: '€',
      frequency: 'monthly',
      dayOfMonth: 24,
      color: '#0077B5',
      logo: 'in',
      startDate: '2023-05-01'
    },
    {
      id: 5,
      name: 'Airbnb',
      amount: 12.99,
      currency: '€',
      frequency: 'monthly',
      dayOfMonth: 7,
      color: '#FF5A5F',
      logo: 'A',
      startDate: '2022-07-12'
    }
  ];
  
  // Function to fetch data from Google Sheets
  const fetchFromGoogleSheets = useCallback(async (spreadsheetId, apiKey) => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would fetch actual data from Google Sheets
      setSubscriptions(mockData);
      setIsConnected(true);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch subscription data. Please check your API key and spreadsheet ID.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load settings from local storage
    const settings = loadSettings();
    setUserLocale(settings.locale);
    setIsDarkMode(settings.isDarkMode);
    
    // Check if we have connection details
    const connected = checkConnection();
    setIsConnected(connected);
    
    if (connected && settings.spreadsheetId && settings.apiKey) {
      fetchFromGoogleSheets(settings.spreadsheetId, settings.apiKey);
    } else {
      // Use mock data instead of showing setup by default
      setSubscriptions(mockData);
      setLoading(false);
    }
  }, [fetchFromGoogleSheets]);

  const handleSaveSettings = (spreadsheetId, apiKey, locale) => {
    // Save settings to local storage
    saveSettingsToStorage({
      spreadsheetId,
      apiKey,
      locale
    });
    
    setUserLocale(locale);
    fetchFromGoogleSheets(spreadsheetId, apiKey);
    setSetupVisible(false);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveSettingsToStorage({ isDarkMode: newMode });
  };

  // Calendar helper functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthName = (month) => {
    return new Date(currentDate.getFullYear(), month).toLocaleString(userLocale, { month: 'long' });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getSubscriptionsForDay = (day) => {
    return subscriptions.filter(sub => sub.dayOfMonth === day);
  };

  // Calculate total monthly spend
  const calculateMonthlyTotal = () => {
    let total = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    return total.toLocaleString(userLocale, { 
      style: 'currency', 
      currency: subscriptions[0]?.currency.replace('€', 'EUR') || 'EUR' 
    });
  };

  // Calculate total spent since start date
  const calculateTotalSpent = (subscription) => {
    const startDate = new Date(subscription.startDate);
    const currentDate = new Date();
    
    // Calculate months between start date and current date
    const months = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (currentDate.getMonth() - startDate.getMonth());
    
    // Calculate total spent
    const totalSpent = months * subscription.amount;
    
    return totalSpent.toLocaleString(userLocale, { 
      style: 'currency', 
      currency: subscription.currency.replace('€', 'EUR') || 'EUR' 
    });
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Get days in current month and previous month
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Calculate days from previous month to display
    const prevMonthDays = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      prevMonthDays.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isPrevMonth: true
      });
    }
    
    // Calculate days in current month
    const currentMonthDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      currentMonthDays.push({
        day,
        month,
        year,
        isCurrentMonth: true,
        isToday: today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
      });
    }
    
    // Calculate days from next month to display (to fill a 6-row calendar)
    const nextMonthDays = [];
    const totalDaysDisplayed = prevMonthDays.length + currentMonthDays.length;
    const daysToAdd = 42 - totalDaysDisplayed; // 6 rows x 7 days = 42
    
    for (let day = 1; day <= daysToAdd; day++) {
      nextMonthDays.push({
        day,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isNextMonth: true
      });
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };
  
  const getWeekdayNames = () => {
    const weekdays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(2023, 0, i + 1); // January 1, 2023 was a Sunday
      weekdays.push(date.toLocaleString(userLocale, { weekday: 'short' }).toUpperCase());
    }
    return weekdays;
  };

  const handleSubscriptionHover = (subscription, event) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set a small timeout to prevent flickering on quick mouse movements
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSubscription(subscription);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    }, 100);
  };

  const handleSubscriptionLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSubscription(null);
    }, 300);
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 max-w-3xl mx-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className="bg-red-500 text-white p-4 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => {
            setSetupVisible(true);
            setError(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Configure Google Sheets
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen py-8">
      <div className={`max-w-3xl w-full mx-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-lg relative`}>
        {selectedSubscription && (
          <SubscriptionDetail 
            subscription={selectedSubscription} 
            position={hoverPosition}
            isDarkMode={isDarkMode}
            userLocale={userLocale}
            calculateTotalSpent={calculateTotalSpent}
          />
        )}
        
        {hoveredSubscription && !selectedSubscription && (
          <SubscriptionDetail 
            subscription={hoveredSubscription}
            position={hoverPosition}
            isDarkMode={isDarkMode}
            userLocale={userLocale}
            calculateTotalSpent={calculateTotalSpent}
          />
        )}

        {setupVisible && (
          <SetupInstructions 
            isDarkMode={isDarkMode}
            userLocale={userLocale}
            onSaveSettings={handleSaveSettings}
            onCancel={() => setSetupVisible(false)}
          />
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <button 
                onClick={() => navigateMonth(-1)}
                className="w-10 h-10 rounded-full flex items-center justify-center mr-2 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                &lt;
              </button>
              <button 
                onClick={() => navigateMonth(1)}
                className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                &gt;
              </button>
              <h1 className="text-2xl font-bold">
                {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
              </h1>
            </div>
            
            <div className="flex items-center">
              <div className="text-right">
                <div className="text-sm text-gray-400">Monthly spend</div>
                <div className="text-2xl font-bold">{calculateMonthlyTotal()}</div>
              </div>
              <button 
                onClick={toggleDarkMode}
                className="ml-4 p-2 rounded-full hover:bg-gray-700 transition-colors"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button 
                onClick={() => setSetupVisible(!setupVisible)}
                className="ml-2 p-2 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>
          
          {isConnected && (
            <div className="mb-4 p-2 bg-green-800 bg-opacity-20 border border-green-600 rounded-md text-green-400 flex items-center">
              <span className="mr-2">✓</span>
              <span>Connected to Google Sheets</span>
              <button 
                onClick={() => setSetupVisible(true)}
                className="ml-auto text-xs underline"
              >
                Change settings
              </button>
            </div>
          )}
          
          {!isConnected && !setupVisible && (
            <div className="mb-4 p-2 bg-blue-800 bg-opacity-20 border border-blue-600 rounded-md text-blue-400 flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>Using demo data. Connect to Google Sheets for your own subscriptions.</span>
              <button 
                onClick={() => setSetupVisible(true)}
                className="ml-auto text-xs underline"
              >
                Setup connection
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-7 mb-2">
            {getWeekdayNames().map(day => (
              <div key={day} className="text-center p-2 font-medium bg-gray-800 text-gray-300 rounded-md mx-0.5">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar().map((dayObj, index) => {
              const daySubscriptions = dayObj.isCurrentMonth ? getSubscriptionsForDay(dayObj.day) : [];
              const isGrayed = !dayObj.isCurrentMonth;
              
              return (
                <div 
                  key={`${dayObj.year}-${dayObj.month}-${dayObj.day}-${index}`}
                  className={`aspect-square rounded-md flex flex-col p-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${isGrayed ? 'opacity-40' : ''} ${dayObj.isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="text-right font-medium mb-1">{dayObj.day}</div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {daySubscriptions.map(subscription => (
                      <div
                        key={subscription.id}
                        onMouseEnter={(e) => handleSubscriptionHover(subscription, e)}
                        onMouseLeave={handleSubscriptionLeave}
                        onClick={(e) => {
                          setSelectedSubscription(subscription === selectedSubscription ? null : subscription);
                          setHoverPosition({ x: e.clientX, y: e.clientY });
                        }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: subscription.color }}
                        title={subscription.name}
                      >
                        {subscription.logo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCalendar;
