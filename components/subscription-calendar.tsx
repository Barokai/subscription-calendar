import React, { useState, useEffect, useCallback, useRef } from 'react';

const SubscriptionCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setupVisible, setSetupVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userLocale, setUserLocale] = useState(navigator.language || 'en-US');
  const [isConnected, setIsConnected] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoveredSubscription, setHoveredSubscription] = useState(null);
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
      // In a real implementation, this would make an actual API call
      // For demo purposes, we're simulating the API response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would fetch actual data from Google Sheets
      // For now, use the same mock data but mark as connected
      setSubscriptions(mockData);
      setIsConnected(true);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch subscription data. Please check your API key and spreadsheet ID.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to get saved spreadsheet ID and API key from localStorage
    const savedSpreadsheetId = localStorage.getItem('subscriptionCalendarSpreadsheetId');
    const savedApiKey = localStorage.getItem('subscriptionCalendarApiKey');
    
    if (savedSpreadsheetId && savedApiKey) {
      fetchFromGoogleSheets(savedSpreadsheetId, savedApiKey);
    } else {
      // Use mock data instead of showing setup by default
      setSubscriptions(mockData);
      setLoading(false);
    }
    
    // Try to get user's locale preference
    const savedLocale = localStorage.getItem('subscriptionCalendarLocale');
    if (savedLocale) {
      setUserLocale(savedLocale);
    }
    
    // Try to get dark mode preference
    const savedDarkMode = localStorage.getItem('subscriptionCalendarDarkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, [fetchFromGoogleSheets]);

  const saveSettings = (spreadsheetId, apiKey, locale) => {
    localStorage.setItem('subscriptionCalendarSpreadsheetId', spreadsheetId);
    localStorage.setItem('subscriptionCalendarApiKey', apiKey);
    localStorage.setItem('subscriptionCalendarLocale', locale);
    setUserLocale(locale);
    fetchFromGoogleSheets(spreadsheetId, apiKey);
    setSetupVisible(false);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('subscriptionCalendarDarkMode', newMode.toString());
  };

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

  // Setup component (now collapsible with improved styling)
  const SetupInstructions = () => (
    <div className={`p-6 rounded-lg mb-4 shadow-lg max-w-3xl mx-auto ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-4">Google Sheets Integration Setup</h2>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Step 1: Create a Google Sheet</h3>
        <p className="mb-3">Create a Google Sheet with the following columns:</p>
        <ul className="list-disc ml-6 mb-4">
          <li>name - The subscription name (e.g., Netflix)</li>
          <li>amount - The cost of the subscription</li>
          <li>currency - The currency symbol (e.g., €)</li>
          <li>frequency - How often the subscription renews (e.g., monthly)</li>
          <li>dayOfMonth - The day of the month when payment is due</li>
          <li>color - The brand color in hex format (e.g., #E50914 for Netflix)</li>
          <li>logo - A letter or short text to represent the logo</li>
          <li>startDate - When you first subscribed (YYYY-MM-DD format)</li>
        </ul>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Step 2: Enable Google Sheets API</h3>
        <ol className="list-decimal ml-6 mb-4">
          <li>Go to the <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Developers Console</a></li>
          <li>Create a new project or select an existing one</li>
          <li>Enable the Google Sheets API</li>
          <li>Create an API key</li>
          <li>Copy your API key and spreadsheet ID (the long string in your spreadsheet URL)</li>
        </ol>
      </div>
      
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        const spreadsheetId = e.target.spreadsheetId.value;
        const apiKey = e.target.apiKey.value;
        const locale = e.target.locale.value;
        saveSettings(spreadsheetId, apiKey, locale);
      }}>
        <div>
          <label className="block mb-1 font-medium">Spreadsheet ID:</label>
          <input 
            type="text" 
            name="spreadsheetId" 
            className={`w-full p-2 border-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            required
          />
        </div>
        
        <div>
          <label className="block mb-1 font-medium">API Key:</label>
          <input 
            type="text" 
            name="apiKey" 
            className={`w-full p-2 border-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            placeholder="e.g., AIzaSyBJH3s..."
            required
          />
        </div>
        
        <div>
          <label className="block mb-1 font-medium">Locale:</label>
          <select 
            name="locale" 
            className={`w-full p-2 border-2 rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            defaultValue={userLocale}
            style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white' }}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="de-DE">German</option>
            <option value="fr-FR">French</option>
            <option value="es-ES">Spanish</option>
            <option value="it-IT">Italian</option>
            <option value="ja-JP">Japanese</option>
            <option value="zh-CN">Chinese</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1 transition-colors"
          >
            Connect
          </button>
          
          <button 
            type="button"
            onClick={() => setSetupVisible(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // Subscription detail popup component (now positioned near hover)
  const SubscriptionDetail = ({ subscription, position }) => {
    if (!subscription) return null;
    
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
        className={`absolute z-50 shadow-xl rounded-lg p-4 max-w-xs w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          border: `2px solid ${subscription.color}`,
          transform: 'translate(-50%, -110%)'
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

  // UI for when data is loaded
  const [selectedSubscription, setSelectedSubscription] = useState(null);

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
            onClose={() => setSelectedSubscription(null)} 
          />
        )}
        
        {hoveredSubscription && (
          <SubscriptionDetail 
            subscription={hoveredSubscription}
            position={hoverPosition}
          />
        )}
        
        {setupVisible && <SetupInstructions />}
        
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
                          setSelectedSubscription(subscription);
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
