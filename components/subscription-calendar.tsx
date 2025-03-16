import React, { useState, useEffect, useCallback, useRef, MouseEvent } from "react";
import SetupInstructions from "./setup-instructions";
import SubscriptionDetail from "./subscription-detail";
import {
  loadSettings,
  saveSettings as saveSettingsToStorage,
  isConnected as checkConnection,
  isDemoMode,
} from "./settings-service";
import { 
  fetchSubscriptions, 
  Subscription, 
  isPaymentInMonth 
} from "./google-sheets-service";
import { mockSubscriptions } from "../data/mock-subscriptions";
import { 
  parseDate, 
  getFirstDayOfWeek, 
  reorderWeekdaysForLocale, 
  adjustDayOfWeek 
} from "./date-utils";
import MonthlySummaryTable from "./monthly-summary-table";
import SubscriptionTrends from "./subscription-trends";
import DaySubscriptionsOverlay from "./day-subscriptions-overlay";
import { getSubscriptionsForDay, SubscriptionIcons } from "./calendar-helpers";
import styles from '../styles/calendar.module.css';

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
  const [lastFetchTime, setLastFetchTime] = useState<Date | undefined>(undefined);
  const [expandedDayIndexes, setExpandedDayIndexes] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{ day: number; month: number; year: number; subscriptions: Subscription[] } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

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
        setLastFetchTime(new Date()); // Set last fetch time
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
        setLastFetchTime(new Date()); // Set last fetch time
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

    // Update URL - remove query parameter when leaving demo mode
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      
      if (!newDemoMode && url.searchParams.has('demo')) {
        // Remove the demo parameter when exiting demo mode
        url.searchParams.delete('demo');
        window.history.replaceState({}, '', url.toString());
      } else if (newDemoMode && !url.searchParams.has('demo')) {
        // Add the demo parameter when entering demo mode
        url.searchParams.set('demo', 'true');
        window.history.replaceState({}, '', url.toString());
      }
    }

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

  // Calculate total monthly spend using actual costs for the current month
  const calculateMonthlyTotal = (): string => {
    if (subscriptions.length === 0) return "0";
    
    // Sum only subscriptions that should appear in this month
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let total = subscriptions.reduce((sum, sub) => {
      const startDate = parseDate(sub.startDate, userLocale);
      const shouldInclude = isPaymentInMonth(sub.frequency, startDate, currentMonth, currentYear);
      return sum + (shouldInclude ? sub.amount : 0);
    }, 0);
    
    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";
    
    return total.toLocaleString(userLocale, {
      style: "currency",
      currency
    });
  };

  // Calculate total spent since start date, accounting for frequency
  const calculateTotalSpent = (subscription: Subscription): string => {
    // Get correctly parsed start date
    const startDate = parseDate(subscription.startDate, userLocale);
    const currentDate = new Date();
    
    // Log key information for debugging
    console.log(`Calculating total spent for ${subscription.name}:`);
    console.log(`- Start date: ${startDate.toISOString()}`);
    console.log(`- Frequency: ${subscription.frequency}`);
    console.log(`- Amount: ${subscription.amount}`);
    
    // Calculate total payments based on frequency
    let totalPayments = 0;
    
    // Get years difference
    const yearsDiff = currentDate.getFullYear() - startDate.getFullYear();
    
    // Get months difference for monthly calculations
    const rawMonths = yearsDiff * 12 + (currentDate.getMonth() - startDate.getMonth());
    
    // Adjust for the day of month
    let monthsDiff = rawMonths;
    if (currentDate.getDate() < startDate.getDate()) {
      monthsDiff--; // Not yet reached the payment day this month
    }
    
    console.log(`- Years difference: ${yearsDiff}`);
    console.log(`- Months difference: ${monthsDiff}`);
    
    switch (subscription.frequency) {
      case 'yearly':
        totalPayments = yearsDiff;
        // If we've passed the anniversary date this year, add one more payment
        if (
          currentDate.getMonth() > startDate.getMonth() || 
          (currentDate.getMonth() === startDate.getMonth() && currentDate.getDate() >= startDate.getDate())
        ) {
          totalPayments++;
        }
        break;
        
      case 'quarterly':
        totalPayments = Math.floor(monthsDiff / 3);
        break;
        
      case 'biannually':
        totalPayments = Math.floor(monthsDiff / 6);
        break;
        
      case 'monthly':
        totalPayments = monthsDiff;
        break;
        
      // ...other frequencies...
    }
    
    // Ensure we never have negative payments
    totalPayments = Math.max(0, totalPayments);
    
    console.log(`- Total payments: ${totalPayments}`);
    const totalSpent = totalPayments * subscription.amount;
    
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
    // Only handle hover if nothing is selected
    if (selectedSubscription) return;
    
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
  
  const handleSubscriptionClick = (subscription: Subscription, event: MouseEvent): void => {
    // Clear any hover timeout
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      setHoveredSubscription(null);
    }
    
    // Toggle selection
    const isDeselecting = subscription === selectedSubscription;
    setSelectedSubscription(isDeselecting ? null : subscription);
    
    if (isDeselecting) {
      return; // If deselecting, no need to update position
    }
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 640; // sm breakpoint in Tailwind
    
    // Calculate position - centered on mobile
    const x = isMobile 
      ? viewportWidth / 2  // Center on screen for mobile
      : event.clientX;     // Use click position for desktop
      
    // Position above the clicked element by default
    let y = event.clientY;
    
    setHoverPosition({ x, y });
    
    // Add event listener for click outside
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  };
  
  // Function to handle clicks outside the subscription detail
  const handleClickOutside = useCallback((event: globalThis.MouseEvent) => {
    // Check if the click is outside both subscription icons and detail
    const target = event.target as HTMLElement;
    const isSubscriptionIcon = target.closest('[data-subscription-icon]');
    const isSubscriptionDetail = target.closest('[data-subscription-detail]');
    const isShowMoreButton = target.closest('[data-show-more]');
    
    // Handle clicks outside subscription detail
    if (!isSubscriptionIcon && !isSubscriptionDetail && selectedSubscription) {
      setSelectedSubscription(null);
      document.removeEventListener('click', handleClickOutside);
    }
    
    // Handle clicks outside of day cells (to collapse expanded days)
    if (!isShowMoreButton && !isSubscriptionIcon && expandedDayIndexes.size > 0) {
      setExpandedDayIndexes(new Set());
    }
  }, [selectedSubscription, expandedDayIndexes]);
  
  // Make sure to clean up event listener when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSubscriptionLeave = (): void => {
    // Don't clear hover if an item is selected
    if (selectedSubscription) return;
    
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredSubscription(null);
    }, 300);
  };

  // Function to toggle expansion state of a calendar day
  const toggleDayExpansion = (dayKey: string) => {
    const newExpandedDays = new Set(expandedDayIndexes);
    if (newExpandedDays.has(dayKey)) {
      newExpandedDays.delete(dayKey);
    } else {
      newExpandedDays.add(dayKey);
    }
    setExpandedDayIndexes(newExpandedDays);
  };
  
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
  
  // Function to handle day click (for mobile view)
  const handleDayClick = (day: number, month: number, year: number, subscriptions: Subscription[]) => {
    // Only show overlay if there are subscriptions and we're on mobile
    if (subscriptions.length > 0 && isMobile) {
      setSelectedDay({ day, month, year, subscriptions });
    }
  };
  
  // Function to close the day overlay
  const closeDayOverlay = () => {
    setSelectedDay(null);
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
            positionType="click"
            onClose={() => setSelectedSubscription(null)}
          />
        )}

        {hoveredSubscription && !selectedSubscription && (
          <SubscriptionDetail
            subscription={hoveredSubscription}
            position={hoverPosition}
            isDarkMode={isDarkMode}
            userLocale={userLocale}
            calculateTotalSpent={calculateTotalSpent}
            positionType="hover"
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

        {/* Day Subscriptions Overlay (for mobile) */}
        {selectedDay && (
          <DaySubscriptionsOverlay
            day={selectedDay.day}
            month={selectedDay.month}
            year={selectedDay.year}
            subscriptions={selectedDay.subscriptions}
            userLocale={userLocale}
            isDarkMode={isDarkMode}
            onClose={closeDayOverlay}
            onSubscriptionClick={handleSubscriptionClick}
          />
        )}

        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-2 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                &lt;
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-4 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                &gt;
              </button>
              <h1 className="text-xl sm:text-2xl font-bold">
                {getMonthName(currentDate.getMonth())}{" "}
                {currentDate.getFullYear()}
              </h1>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-between sm:justify-normal">
              <div className="text-right">
                <div className="text-xs sm:text-sm text-gray-400">Monthly spend</div>
                <div className="text-lg sm:text-2xl font-bold">
                  {calculateMonthlyTotal()}
                </div>
              </div>
              <div className="flex">
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
          </div>

          {isConnected && (
            <div className="mb-4 p-2 bg-green-800 bg-opacity-20 border border-green-600 rounded-md text-green-400 flex flex-wrap items-center">
              <span className="mr-2">✓</span>
              <span className="text-xs sm:text-sm">Connected to Google Sheets</span>
              <button
                onClick={() => setSetupVisible(true)}
                className="ml-auto text-xs underline"
              >
                Change settings
              </button>
            </div>
          )}

          {inDemoMode && (
            <div className="mb-4 p-2 bg-purple-800 bg-opacity-20 border border-purple-600 rounded-md text-purple-400 flex flex-wrap items-center">
              <span className="mr-2">🔍</span>
              <span>Running in demo mode with sample data</span>
              <div className="ml-auto flex flex-wrap mt-1 sm:mt-0">
                <button
                  onClick={() => setSetupVisible(true)}
                  className="text-xs underline mr-3"
                >
                  Connect to real data
                </button>
                <button
                  onClick={toggleDemoMode}
                  className="text-xs underline"
                >
                  Exit demo
                </button>
              </div>
            </div>
          )}

          {!isConnected && !inDemoMode && !setupVisible && (
            <div className="mb-4 p-2 bg-blue-800 bg-opacity-20 border border-blue-600 rounded-md text-blue-400 flex flex-wrap items-center">
              <span className="mr-2">ℹ️</span>
              <span>
                Using sample data. Connect to Google Sheets for your own
                subscriptions.
              </span>
              <div className="ml-auto flex flex-wrap mt-1 sm:mt-0">
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
                className="text-center p-1 sm:p-2 text-xs sm:text-base font-medium bg-gray-800 text-gray-300 rounded-md mx-0.5"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderCalendar().map((dayObj, index) => {
              const dayKey = `${dayObj.year}-${dayObj.month}-${dayObj.day}`;
              const daySubscriptions = dayObj.isCurrentMonth
                ? getSubscriptionsForDay(dayObj.day, subscriptions, userLocale, currentDate.getMonth(), currentDate.getFullYear())
                : [];
              const isGrayed = !dayObj.isCurrentMonth;

              return (
                <div
                  key={`${dayKey}-${index}`}
                  className={`rounded-md ${styles.calendarDay} ${
                    isDarkMode ? "bg-gray-800" : "bg-gray-100"
                  } ${isGrayed ? "opacity-40" : ""} ${
                    dayObj.isToday ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => isMobile && handleDayClick(dayObj.day, dayObj.month, dayObj.year, daySubscriptions)}
                >
                  <div className={styles.calendarDayContent}>
                    <div className="text-right font-medium mb-1">
                      {dayObj.day}
                    </div>
                    
                    {/* Use the extracted SubscriptionIcons component */}
                    {daySubscriptions.length > 0 && (
                      <SubscriptionIcons
                        daySubscriptions={daySubscriptions}
                        expandedDays={expandedDayIndexes}
                        dayKey={dayKey}
                        handleSubscriptionHover={handleSubscriptionHover}
                        handleSubscriptionLeave={handleSubscriptionLeave}
                        handleSubscriptionClick={handleSubscriptionClick}
                        toggleDayExpansion={toggleDayExpansion}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Monthly Summary Table */}
          <MonthlySummaryTable 
            subscriptions={subscriptions}
            month={currentDate.getMonth()}
            year={currentDate.getFullYear()}
            userLocale={userLocale}
            isDarkMode={isDarkMode}
            onSubscriptionClick={handleSubscriptionClick}
          />
          
          {/* Subscription Trends */}
          <SubscriptionTrends
            subscriptions={subscriptions}
            userLocale={userLocale}
            isDarkMode={isDarkMode}
            lastFetchTime={lastFetchTime}
            currentMonth={currentDate.getMonth()}
            currentYear={currentDate.getFullYear()}
          />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCalendar;
