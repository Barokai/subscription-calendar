import React, { useState, useEffect, useCallback, useRef, MouseEvent } from "react";
import SetupInstructions from "./setup-instructions";
import SubscriptionDetail from "./subscription-detail";
import {
  loadSettings,
  saveSettings as saveSettingsToStorage,
  isConnected as checkConnection,
  isDemoMode,
} from "./settings-service";
import { fetchSubscriptions, Subscription } from "./google-sheets-service";
import { mockSubscriptions } from "../data/mock-subscriptions";
import { 
  parseDate, 
  monthsBetweenDates, 
  getFirstDayOfWeek, 
  reorderWeekdaysForLocale, 
  adjustDayOfWeek
} from "./date-utils";

interface CalendarDayObject {
  day: number;
  month: number;
  year: number;
  isPrevMonth?: boolean;
  isCurrentMonth?: boolean;
  isNextMonth?: boolean;
  isToday?: boolean;
}

const SubscriptionCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [setupVisible, setSetupVisible] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [userLocale, setUserLocale] = useState<string>("en-US");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [hoveredSubscription, setHoveredSubscription] = useState<Subscription | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [inDemoMode, setInDemoMode] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState<string | undefined>(undefined);
  const [currentApiKey, setCurrentApiKey] = useState<string | undefined>(undefined);
  const [useEnvSpreadsheetId, setUseEnvSpreadsheetId] = useState<boolean>(false);
  const [useEnvApiKey, setUseEnvApiKey] = useState<boolean>(false);
  const [hasEnvSpreadsheetId, setHasEnvSpreadsheetId] = useState<boolean>(false);
  const [hasEnvApiKey, setHasEnvApiKey] = useState<boolean>(false);

  // Function to fetch data from Google Sheets
  const fetchFromGoogleSheets = useCallback(async (
    spreadsheetId: string, 
    apiKey: string, 
    useEnvSheet: boolean = false, 
    useEnvKey: boolean = false
  ): Promise<void> => {
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

      // Verify connection through server API first
      try {
        const response = await fetch('/api/sheets-connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spreadsheetId,
            apiKey,
            useEnvSpreadsheetId: useEnvSheet,
            useEnvApiKey: useEnvKey
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to connect to Google Sheets');
        }

        // Call the Google Sheets API service
        const data = await fetchSubscriptions(
          useEnvSheet ? result.spreadsheetId || '' : spreadsheetId,
          useEnvKey ? 'ENV_KEY_USED' : apiKey,
          useEnvSheet,
          useEnvKey
        );
        
        setSubscriptions(data);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          "Failed to fetch subscription data. Please check your connection settings."
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
    const initializeApp = async () => {
      try {
        // Load settings from local storage
        const settings = await loadSettings();
        setUserLocale(settings.locale);
        setIsDarkMode(settings.isDarkMode);
        setInDemoMode(settings.demoMode || false);
        setCurrentSpreadsheetId(settings.spreadsheetId);
        setCurrentApiKey(settings.apiKey);
        setUseEnvSpreadsheetId(settings.useEnvSpreadsheetId || false);
        setUseEnvApiKey(settings.useEnvApiKey || false);
        setHasEnvSpreadsheetId(settings.hasEnvSpreadsheetId || false);
        setHasEnvApiKey(settings.hasEnvApiKey || false);

        if (typeof window !== 'undefined') {
          // Check for demo mode in URL
          const urlParams = new URLSearchParams(window.location.search);
          const demoParam = urlParams.get("demo");

          if (demoParam === "true") {
            // Force demo mode if specified in URL
            setInDemoMode(true);
            fetchFromGoogleSheets("", ""); // Empty parameters will trigger mock data
            return;
          }
        }

        // Check if we have connection details either through env vars or user settings
        const connected = await checkConnection();
        setIsConnected(connected);

        // We can have a connection in 3 ways:
        // 1. Using env variables for both spreadsheetId and apiKey
        const usingEnvVars = settings.useEnvSpreadsheetId && settings.useEnvApiKey &&
                           settings.hasEnvSpreadsheetId && settings.hasEnvApiKey;
        
        // 2. Using user-provided settings for both
        const usingUserSettings = settings.spreadsheetId && settings.apiKey;
        
        // 3. A mix of env vars and user settings
        const usingMixedSettings = 
          (settings.useEnvSpreadsheetId && settings.hasEnvSpreadsheetId && settings.apiKey) ||
          (settings.useEnvApiKey && settings.hasEnvApiKey && settings.spreadsheetId);

        if (connected && (usingEnvVars || usingUserSettings || usingMixedSettings)) {
          fetchFromGoogleSheets(
            settings.spreadsheetId || '',
            settings.apiKey || '',
            settings.useEnvSpreadsheetId,
            settings.useEnvApiKey
          );
        } else {
          // Use mock data if no connection
          setSubscriptions(mockSubscriptions);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        setError("Failed to initialize application settings");
        setSubscriptions(mockSubscriptions);
        setLoading(false);
      }
    };

    initializeApp();
  }, [fetchFromGoogleSheets]);

  const handleSaveSettings = (
    spreadsheetId: string, 
    apiKey: string, 
    locale: string,
    useEnvSpreadsheetId: boolean = false,
    useEnvApiKey: boolean = false
  ): void => {
    // Save settings to local storage
    saveSettingsToStorage({
      spreadsheetId,
      apiKey,
      locale,
      useEnvSpreadsheetId,
      useEnvApiKey,
      demoMode: false, // Turn off demo mode when saving real settings
    });

    setUserLocale(locale);
    setUseEnvSpreadsheetId(useEnvSpreadsheetId);
    setUseEnvApiKey(useEnvApiKey);
    setCurrentSpreadsheetId(spreadsheetId);
    setCurrentApiKey(apiKey);
    setInDemoMode(false);
    
    fetchFromGoogleSheets(spreadsheetId, apiKey, useEnvSpreadsheetId, useEnvApiKey);
    setSetupVisible(false);
  };

  const toggleDarkMode = (): void => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveSettingsToStorage({ isDarkMode: newMode });
  };

  const toggleDemoMode = async (): Promise<void> => {
    const newDemoMode = !inDemoMode;
    setInDemoMode(newDemoMode);
    saveSettingsToStorage({ demoMode: newDemoMode });

    if (newDemoMode) {
      fetchFromGoogleSheets("", ""); // Empty parameters will trigger mock data
    } else {
      // Try to load real data if we have credentials
      const settings = await loadSettings();
      if (
        (settings.useEnvSpreadsheetId && settings.hasEnvSpreadsheetId) ||
        (settings.useEnvApiKey && settings.hasEnvApiKey) ||
        settings.spreadsheetId ||
        settings.apiKey
      ) {
        fetchFromGoogleSheets(
          settings.spreadsheetId || '',
          settings.apiKey || '',
          settings.useEnvSpreadsheetId,
          settings.useEnvApiKey
        );
      }
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthName = (month: number): string => {
    return new Date(currentDate.getFullYear(), month).toLocaleString(
      userLocale,
      { month: "long" }
    );
  };

  const navigateMonth = (direction: number): void => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getSubscriptionsForDay = (day: number): Subscription[] => {
    return subscriptions.filter((sub) => sub.dayOfMonth === day);
  };

  // Calculate total monthly spend
  const calculateMonthlyTotal = (): string => {
    if (subscriptions.length === 0) return "0";
    
    let total = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";
    
    return total.toLocaleString(userLocale, {
      style: "currency",
      currency
    });
  };

  // Calculate total spent since start date
  const calculateTotalSpent = (subscription: Subscription): string => {
    // Use the parseDate function with the user's locale
    const startDate = parseDate(subscription.startDate, userLocale);
    const currentDate = new Date();
    
    // Calculate months between start date and current date using our utility function
    const months = monthsBetweenDates(startDate, currentDate);
    
    // Calculate total spent
    const totalSpent = months * subscription.amount;
    
    return totalSpent.toLocaleString(userLocale, {
      style: 'currency',
      currency: subscription.currency.replace("€", "EUR") || "EUR",
    });
  };

  const renderCalendar = (): CalendarDayObject[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Get the first day of week based on locale
    const firstDayOfWeek = getFirstDayOfWeek(userLocale);
    
    // Get days in current month and previous month
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Adjust the first day of month based on the locale's first day of week
    const adjustedFirstDayOfMonth = adjustDayOfWeek(firstDayOfMonth, firstDayOfWeek);
    
    // Calculate days from previous month to display
    const prevMonthDays: CalendarDayObject[] = [];
    for (let i = adjustedFirstDayOfMonth - 1; i >= 0; i--) {
      prevMonthDays.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isPrevMonth: true,
      });
    }

    // Calculate days in current month
    const currentMonthDays: CalendarDayObject[] = [];
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
    const nextMonthDays: CalendarDayObject[] = [];
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

  const getWeekdayNames = (): string[] => {
    // Get the first day of week based on locale
    const firstDayOfWeek = getFirstDayOfWeek(userLocale);
    
    // Generate weekday names starting from Sunday
    const sundayFirstWeekdays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(2023, 0, i + 1); // January 1, 2023 was a Sunday
      sundayFirstWeekdays.push(
        date.toLocaleString(userLocale, { weekday: "short" }).toUpperCase()
      );
    }
    
    // Reorder weekdays based on locale's first day of week
    return reorderWeekdaysForLocale(sundayFirstWeekdays, firstDayOfWeek);
  };

  const handleSubscriptionHover = (subscription: Subscription, event: MouseEvent): void => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }

    // Set a small timeout to prevent flickering on quick mouse movements
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredSubscription(subscription);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    }, 100);
  };

  const handleSubscriptionLeave = (): void => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
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
    <div className="flex justify-center items-start min-h-screen py-2">
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
            spreadsheetId={currentSpreadsheetId}
            apiKey={currentApiKey}
            hasEnvSpreadsheetId={hasEnvSpreadsheetId}
            hasEnvApiKey={hasEnvApiKey}
            useEnvSpreadsheetId={useEnvSpreadsheetId}
            useEnvApiKey={useEnvApiKey}
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
                        onMouseEnter={(e: React.MouseEvent) =>
                          handleSubscriptionHover(subscription, e)
                        }
                        onMouseLeave={handleSubscriptionLeave}
                        onClick={(e: React.MouseEvent) => {
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
