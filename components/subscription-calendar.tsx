import React, { useState, useEffect, useCallback, useRef } from "react";
import SetupInstructions from "./setup-instructions";
import SubscriptionDetail from "./subscription-detail";
import {
  loadSettings,
  saveSettings as saveSettingsToStorage,
  isConnected as checkConnection,
  isDemoMode,
} from "./settings-service";
import { fetchSubscriptions, mockSubscriptions } from "./google-sheets-service";

const SubscriptionCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setupVisible, setSetupVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userLocale, setUserLocale] = useState("en-US");
  const [isConnected, setIsConnected] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoveredSubscription, setHoveredSubscription] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [inDemoMode, setInDemoMode] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Function to fetch data from Google Sheets
  const fetchFromGoogleSheets = useCallback(async (spreadsheetId, apiKey) => {
    try {
      setLoading(true);
      setError(null);

      // Check if we are in demo mode (via query param or setting)
      const demoMode = isDemoMode();
      setInDemoMode(demoMode);

      if (demoMode) {
        // Use mock data if in demo mode
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay
        setSubscriptions(mockSubscriptions);
        setIsConnected(false); // We're not actually connected in demo mode
        setLoading(false);
        return;
      }

      // Real implementation: fetch data from Google Sheets
      if (!spreadsheetId || !apiKey) {
        // If no spreadsheetId or apiKey, use mock data
        setSubscriptions(mockSubscriptions);
        setIsConnected(false);
        setLoading(false);
        return;
      }

      try {
        // Call the Google Sheets API service
        const data = await fetchSubscriptions(spreadsheetId, apiKey);
        setSubscriptions(data);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          "Failed to fetch subscription data. Please check your API key and spreadsheet ID."
        );
        setSubscriptions(mockSubscriptions); // Fallback to mock data on error
        setIsConnected(false);
      }

      setLoading(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred while fetching data.");
      setSubscriptions(mockSubscriptions); // Fallback to mock data on error
      setIsConnected(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load settings from local storage
    const settings = loadSettings();
    setUserLocale(settings.locale);
    setIsDarkMode(settings.isDarkMode);
    setInDemoMode(settings.demoMode || false);

    // Check for demo mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get("demo");

    if (demoParam === "true") {
      // Force demo mode if specified in URL
      setInDemoMode(true);
      fetchFromGoogleSheets("", ""); // Empty parameters will trigger mock data
      return;
    }

    // Check if we have connection details
    const connected = checkConnection();
    setIsConnected(connected);

    if (connected && settings.spreadsheetId && settings.apiKey) {
      fetchFromGoogleSheets(settings.spreadsheetId, settings.apiKey);
    } else {
      // Use mock data if no connection
      setSubscriptions(mockSubscriptions);
      setLoading(false);
    }
  }, [fetchFromGoogleSheets]);

  const handleSaveSettings = (spreadsheetId, apiKey, locale) => {
    // Save settings to local storage
    saveSettingsToStorage({
      spreadsheetId,
      apiKey,
      locale,
      demoMode: false, // Turn off demo mode when saving real settings
    });

    setUserLocale(locale);
    setInDemoMode(false);
    fetchFromGoogleSheets(spreadsheetId, apiKey);
    setSetupVisible(false);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveSettingsToStorage({ isDarkMode: newMode });
  };

  const toggleDemoMode = () => {
    const newDemoMode = !inDemoMode;
    setInDemoMode(newDemoMode);
    saveSettingsToStorage({ demoMode: newDemoMode });

    if (newDemoMode) {
      fetchFromGoogleSheets("", ""); // Empty parameters will trigger mock data
    } else {
      // Try to load real data if we have credentials
      const settings = loadSettings();
      if (settings.spreadsheetId && settings.apiKey) {
        fetchFromGoogleSheets(settings.spreadsheetId, settings.apiKey);
      }
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthName = (month) => {
    return new Date(currentDate.getFullYear(), month).toLocaleString(
      userLocale,
      { month: "long" }
    );
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getSubscriptionsForDay = (day) => {
    return subscriptions.filter((sub) => sub.dayOfMonth === day);
  };

  // Calculate total monthly spend
  const calculateMonthlyTotal = () => {
    let total = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    return total.toLocaleString(userLocale, {
      style: "currency",
      currency: subscriptions[0]?.currency.replace("€", "EUR") || "EUR",
    });
  };

  // Calculate total spent since start date
  const calculateTotalSpent = (subscription) => {
    const startDate = new Date(subscription.startDate);
    const currentDate = new Date();

    // Calculate months between start date and current date
    const months =
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth());

    // Calculate total spent
    const totalSpent = months * subscription.amount;

    return totalSpent.toLocaleString(userLocale, {
      style: "currency",
      currency: subscription.currency.replace("€", "EUR") || "EUR",
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
        isPrevMonth: true,
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
        isToday:
          today.getDate() === day &&
          today.getMonth() === month &&
          today.getFullYear() === year,
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
        isNextMonth: true,
      });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const getWeekdayNames = () => {
    const weekdays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(2023, 0, i + 1); // January 1, 2023 was a Sunday
      weekdays.push(
        date.toLocaleString(userLocale, { weekday: "short" }).toUpperCase()
      );
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
      <div
        className={`flex justify-center items-center h-64 ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"
        }`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-4 max-w-3xl mx-auto ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"
        }`}
      >
        <div className="bg-red-500 text-white p-4 rounded mb-4">{error}</div>
        <button
          onClick={() => {
            setSetupVisible(true);
            setError(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Configure Google Sheets
        </button>
        <button onClick={toggleDemoMode} className="text-xs underline ml-4">
          Use demo mode instead
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen py-8">
      <div
        className={`max-w-3xl w-full mx-auto ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"
        } rounded-lg shadow-lg relative`}
      >
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
                {getMonthName(currentDate.getMonth())}{" "}
                {currentDate.getFullYear()}
              </h1>
            </div>

            <div className="flex items-center">
              <div className="text-right">
                <div className="text-sm text-gray-400">Monthly spend</div>
                <div className="text-2xl font-bold">
                  {calculateMonthlyTotal()}
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className="ml-4 p-2 rounded-full hover:bg-gray-700 transition-colors"
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
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

          {inDemoMode && (
            <div className="mb-4 p-2 bg-purple-800 bg-opacity-20 border border-purple-600 rounded-md text-purple-400 flex items-center">
              <span className="mr-2">🔍</span>
              <span>Running in demo mode with sample data</span>
              <button
                onClick={() => setSetupVisible(true)}
                className="ml-auto text-xs underline"
              >
                Connect to real data
              </button>
              <button
                onClick={toggleDemoMode}
                className="ml-2 text-xs underline"
              >
                Exit demo
              </button>
            </div>
          )}

          {!isConnected && !inDemoMode && !setupVisible && (
            <div className="mb-4 p-2 bg-blue-800 bg-opacity-20 border border-blue-600 rounded-md text-blue-400 flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>
                Using sample data. Connect to Google Sheets for your own
                subscriptions.
              </span>
              <div className="ml-auto flex">
                <button
                  onClick={() => setSetupVisible(true)}
                  className="text-xs underline mr-3"
                >
                  Setup connection
                </button>
                <button onClick={toggleDemoMode} className="text-xs underline">
                  Use demo mode
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-7 mb-2">
            {getWeekdayNames().map((day) => (
              <div
                key={day}
                className="text-center p-2 font-medium bg-gray-800 text-gray-300 rounded-md mx-0.5"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderCalendar().map((dayObj, index) => {
              const daySubscriptions = dayObj.isCurrentMonth
                ? getSubscriptionsForDay(dayObj.day)
                : [];
              const isGrayed = !dayObj.isCurrentMonth;

              return (
                <div
                  key={`${dayObj.year}-${dayObj.month}-${dayObj.day}-${index}`}
                  className={`aspect-square rounded-md flex flex-col p-2 ${
                    isDarkMode ? "bg-gray-800" : "bg-gray-100"
                  } ${isGrayed ? "opacity-40" : ""} ${
                    dayObj.isToday ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="text-right font-medium mb-1">
                    {dayObj.day}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {daySubscriptions.map((subscription) => (
                      <div
                        key={subscription.id}
                        onMouseEnter={(e) =>
                          handleSubscriptionHover(subscription, e)
                        }
                        onMouseLeave={handleSubscriptionLeave}
                        onClick={(e) => {
                          setSelectedSubscription(
                            subscription === selectedSubscription
                              ? null
                              : subscription
                          );
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
