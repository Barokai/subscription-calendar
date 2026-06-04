import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  MouseEvent,
} from "react";
import SubscriptionDetail from "./subscription-detail";
import {
  loadSettings,
  saveSettings as saveSettingsToStorage,
} from "./settings-service";
import { Subscription } from "@/lib/subscriptions";
import { Income } from "@/lib/incomes";
import { isPaymentInMonth } from "@/lib/frequency-utils";
import { mockSubscriptions, mockIncomes, mockCreditCards } from "../data/mock-subscriptions";
import {
  parseDate,
  getFirstDayOfWeek,
  reorderWeekdaysForLocale,
  adjustDayOfWeek,
} from "./date-utils";
import MonthlySummaryTable from "./monthly-summary-table";
import SubscriptionTrends from "./subscription-trends";
import YearlyProjection from "./YearlyProjection";
import DaySubscriptionsOverlay from "./day-subscriptions-overlay";
import { getSubscriptionsForDay, getIncomesForDay, DayIcons } from "./calendar-helpers";
import styles from "../styles/calendar.module.css";
import SpendingChart from "./spending-chart";
import IncomeChart from "./income-chart";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useIncomes } from "@/hooks/useIncomes";
import { useCreditCards } from "@/hooks/useCreditCards";
import SubscriptionForm from "./SubscriptionForm";
import ImportModal from "./ImportModal";
import IncomeManager from "./IncomeManager";
import CreditCardManager from "./CreditCardManager";
import SharingManager from "./SharingManager";
import CashFlowProjection from "./CashFlowProjection";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useShares } from "@/hooks/useShares";

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
  const { t, tpl, userLocale } = useI18n();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [inDemoMode, setInDemoMode] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredSubscription, setHoveredSubscription] = useState<Subscription | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [draggedSubscription, setDraggedSubscription] = useState<Subscription | null>(null);
  const [dropTargetDayKey, setDropTargetDayKey] = useState<string | null>(null);
  const [pendingDayUpdate, setPendingDayUpdate] = useState<{ subscription: Subscription; targetDay: number } | null>(null);
  const [dayUpdateError, setDayUpdateError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resettingData, setResettingData] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [expandedDayIndexes, setExpandedDayIndexes] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{
    day: number; month: number; year: number;
    subscriptions: Subscription[]; incomes: Income[];
  } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showSpendingChart, setShowSpendingChart] = useState<boolean>(false);
  const [showIncomeChart, setShowIncomeChart] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"operations" | "insights">("operations");
  const [lastFetchTime, setLastFetchTime] = useState<Date | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { subscriptions, loading, error, add, update, remove } = useSubscriptions(inDemoMode, mockSubscriptions, currentUserId);
  const { incomes, add: addIncome, update: updateIncome, remove: removeIncome } = useIncomes(inDemoMode, mockIncomes);
  const { creditCards, add: addCreditCard, update: updateCreditCard, remove: removeCreditCard } = useCreditCards(inDemoMode, mockCreditCards);
  const { shares, add: addShare, remove: removeShare } = useShares(inDemoMode);

  const isOwnedByCurrentUser = useCallback(
    (userId: string) => inDemoMode || !currentUserId || userId === currentUserId,
    [inDemoMode, currentUserId]
  );

  const ownedSubscriptions = subscriptions.filter((sub) => isOwnedByCurrentUser(sub.userId));
  const sharedSubscriptions = subscriptions.filter((sub) => !isOwnedByCurrentUser(sub.userId));
  const ownedIncomes = incomes.filter((income) => isOwnedByCurrentUser(income.userId));
  const ownedCreditCards = creditCards.filter((card) => isOwnedByCurrentUser(card.userId));

  // Load user preferences
  useEffect(() => {
    const init = async () => {
      const settings = await loadSettings();
      setIsDarkMode(settings.isDarkMode);

      if (typeof window !== "undefined") {
        const demoParam = new URLSearchParams(window.location.search).get("demo");
        if (demoParam === "true" || settings.demoMode) { setInDemoMode(true); }
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (inDemoMode) {
        setCurrentUserId("demo");
        return;
      }

      const supabase = createClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(data.user.id);
    };

    void loadCurrentUser();
  }, [inDemoMode]);

  // Track last fetch time for trends display
  useEffect(() => {
    if (!loading) { setLastFetchTime(new Date()); }
  }, [loading]);

  const toggleDarkMode= (): void => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveSettingsToStorage({ isDarkMode: newMode });
  };

  const toggleDemoMode = (): void => {
    const newDemoMode = !inDemoMode;
    setInDemoMode(newDemoMode);
    saveSettingsToStorage({ demoMode: newDemoMode });

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (!newDemoMode) { url.searchParams.delete("demo"); }
      else { url.searchParams.set("demo", "true"); }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
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
    if (subscriptions.length === 0) {
      return "0";
    }

    // Sum only subscriptions that should appear in this month
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const total = subscriptions.reduce((sum, sub) => {
      const startDate = parseDate(sub.startDate, userLocale);
      const shouldInclude = isPaymentInMonth(
        sub.frequency,
        startDate,
        currentMonth,
        currentYear
      );
      return sum + (shouldInclude ? sub.amount : 0);
    }, 0);

    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";

    return total.toLocaleString(userLocale, {
      style: "currency",
      currency,
    });
  };

  // Quick currency formatter used for bar tooltips and other inline needs
  const fmtAmount = useCallback((amount: number): string => {
    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";
    return amount.toLocaleString(userLocale, { style: "currency", currency });
  }, [subscriptions, userLocale]);

  // Get active subscriptions for the current month (for chart)
  const getActiveSubscriptionsForMonth = (): Subscription[] => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return subscriptions.filter((sub) => {
      const startDate = parseDate(sub.startDate, userLocale);
      return isPaymentInMonth(
        sub.frequency,
        startDate,
        currentMonth,
        currentYear
      );
    });
  };

  // Calculate raw total (number not string)
  const calculateRawMonthlyTotal = (): number => {
    if (subscriptions.length === 0) {
      return 0;
    }

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return subscriptions.reduce((sum, sub) => {
      const startDate = parseDate(sub.startDate, userLocale);
      const shouldInclude = isPaymentInMonth(
        sub.frequency,
        startDate,
        currentMonth,
        currentYear
      );
      return sum + (shouldInclude ? sub.amount : 0);
    }, 0);
  };

  // Get active income sources for the current month
  const getActiveIncomesForMonth = () => {
    const monthIndex = currentDate.getMonth();
    const monthNumber = monthIndex + 1;
    const year = currentDate.getFullYear();
    return ownedIncomes.filter((inc) => {
      const start = new Date(inc.startDate);
      const end = inc.endDate ? new Date(inc.endDate) : null;
      return (
        (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() + 1 <= monthNumber)) &&
        (!end || end.getFullYear() > year || (end.getFullYear() === year && end.getMonth() + 1 >= monthNumber))
      );
    });
  };

  const calculateRawMonthlyIncomeTotal = (): number => {
    return getActiveIncomesForMonth().reduce((sum, inc) => sum + inc.amount, 0);
  };

  const calculateMonthlyIncomeTotal = (): string => {
    const total = calculateRawMonthlyIncomeTotal();
    const currency = ownedIncomes[0]?.currency || "EUR";
    return total.toLocaleString(userLocale, { style: "currency", currency });
  };

  const isSubscriptionEditable = useCallback(
    (subscription: Subscription) => isOwnedByCurrentUser(subscription.userId),
    [isOwnedByCurrentUser]
  );

  const dayFinancials = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const map: Record<number, { expenseTotal: number; incomeTotal: number }> = {};

    subscriptions.forEach((sub) => {
      const start = parseDate(sub.startDate, userLocale);
      if (isPaymentInMonth(sub.frequency, start, month, year)) {
        const d = sub.dayOfMonth;
        if (!map[d]) map[d] = { expenseTotal: 0, incomeTotal: 0 };
        map[d].expenseTotal += sub.amount;
      }
    });

    incomes.forEach((inc) => {
      const start = parseDate(inc.startDate, userLocale);
      const startMonth = start.getMonth();
      const startYear = start.getFullYear();
      if (year < startYear || (year === startYear && month < startMonth)) return;
      if (inc.endDate) {
        const end = parseDate(inc.endDate, userLocale);
        if (year > end.getFullYear() || (year === end.getFullYear() && month > end.getMonth())) return;
      }
      const d = inc.dayOfMonth;
      if (!map[d]) map[d] = { expenseTotal: 0, incomeTotal: 0 };
      map[d].incomeTotal += inc.amount;
    });

    return map;
  }, [subscriptions, incomes, currentDate, userLocale]);

  const { maxExpenseDay, maxIncomeDay } = useMemo(() => {
    let maxE = 0, maxI = 0;
    Object.values(dayFinancials).forEach(({ expenseTotal, incomeTotal }) => {
      if (expenseTotal > maxE) maxE = expenseTotal;
      if (incomeTotal > maxI) maxI = incomeTotal;
    });
    return { maxExpenseDay: maxE, maxIncomeDay: maxI };
  }, [dayFinancials]);

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
    const rawMonths =
      yearsDiff * 12 + (currentDate.getMonth() - startDate.getMonth());

    // Adjust for the day of month
    let monthsDiff = rawMonths;
    if (currentDate.getDate() < startDate.getDate()) {
      monthsDiff--; // Not yet reached the payment day this month
    }

    console.log(`- Years difference: ${yearsDiff}`);
    console.log(`- Months difference: ${monthsDiff}`);

    switch (subscription.frequency) {
      case "yearly":
        totalPayments = yearsDiff;
        // If we've passed the anniversary date this year, add one more payment
        if (
          currentDate.getMonth() > startDate.getMonth() ||
          (currentDate.getMonth() === startDate.getMonth() &&
            currentDate.getDate() >= startDate.getDate())
        ) {
          totalPayments++;
        }
        break;

      case "quarterly":
        totalPayments = Math.floor(monthsDiff / 3);
        break;

      case "biannually":
        totalPayments = Math.floor(monthsDiff / 6);
        break;

      case "monthly":
        totalPayments = monthsDiff;
        break;

      // ...other frequencies...
    }

    // Ensure we never have negative payments
    totalPayments = Math.max(0, totalPayments);

    console.log(`- Total payments: ${totalPayments}`);
    const totalSpent = totalPayments * subscription.amount;

    return totalSpent.toLocaleString(userLocale, {
      style: "currency",
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
    const adjustedFirstDayOfMonth = adjustDayOfWeek(
      firstDayOfMonth,
      firstDayOfWeek
    );

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

  const handleSubscriptionHover = (
    subscription: Subscription,
    event: MouseEvent
  ): void => {
    // Only handle hover if nothing is selected
    if (selectedSubscription) {
      return;
    }

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

  const handleSubscriptionClick = (
    subscription: Subscription,
    event: MouseEvent
  ): void => {
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
    const isMobile = viewportWidth < 640; // sm breakpoint in Tailwind

    // Calculate position - centered on mobile
    const x = isMobile
      ? viewportWidth / 2 // Center on screen for mobile
      : event.clientX; // Use click position for desktop

    // Position above the clicked element by default
    const y = event.clientY;

    setHoverPosition({ x, y });

    // Add event listener for click outside
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
  };

  // Function to handle clicks outside the subscription detail
  const handleClickOutside = useCallback(
    (event: globalThis.MouseEvent) => {
      // Check if the click is outside both subscription icons and detail
      const target = event.target as HTMLElement;
      const isSubscriptionIcon = target.closest("[data-subscription-icon]");
      const isSubscriptionDetail = target.closest("[data-subscription-detail]");
      const isShowMoreButton = target.closest("[data-show-more]");

      // Handle clicks outside subscription detail
      if (
        !isSubscriptionIcon &&
        !isSubscriptionDetail &&
        selectedSubscription
      ) {
        setSelectedSubscription(null);
        document.removeEventListener("click", handleClickOutside);
      }

      // Handle clicks outside of day cells (to collapse expanded days)
      if (
        !isShowMoreButton &&
        !isSubscriptionIcon &&
        expandedDayIndexes.size > 0
      ) {
        setExpandedDayIndexes(new Set());
      }
    },
    [selectedSubscription, expandedDayIndexes]
  );

  // Make sure to clean up event listener when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSubscriptionLeave = (): void => {
    // Don't clear hover if an item is selected
    if (selectedSubscription) {
      return;
    }

    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredSubscription(null);
    }, 300);
  };

  const handleSubscriptionDragStart = (
    subscription: Subscription,
    event: React.DragEvent<HTMLDivElement>
  ): void => {
    if (!isSubscriptionEditable(subscription)) {
      return;
    }

    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }

    setHoveredSubscription(null);
    setDraggedSubscription(subscription);
    setDropTargetDayKey(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", subscription.id);
  };

  const handleSubscriptionDragEnd = (): void => {
    setDraggedSubscription(null);
    setDropTargetDayKey(null);
  };

  const handleDayDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    dayKey: string
  ): void => {
    if (!draggedSubscription) {
      return;
    }
    if (!isSubscriptionEditable(draggedSubscription)) {
      handleSubscriptionDragEnd();
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetDayKey(dayKey);
  };

  const handleDayDrop = (
    event: React.DragEvent<HTMLDivElement>,
    dayObj: CalendarDayObject
  ): void => {
    event.preventDefault();

    if (!draggedSubscription) {
      return;
    }

    if (draggedSubscription.dayOfMonth === dayObj.day) {
      handleSubscriptionDragEnd();
      return;
    }

    setDayUpdateError(null);
    setPendingDayUpdate({
      subscription: draggedSubscription,
      targetDay: dayObj.day,
    });
    handleSubscriptionDragEnd();
  };

  const cancelDayUpdate = (): void => {
    setPendingDayUpdate(null);
    setDayUpdateError(null);
  };

  const confirmDayUpdate = async (): Promise<void> => {
    if (!pendingDayUpdate) {
      return;
    }
    if (!isSubscriptionEditable(pendingDayUpdate.subscription)) {
      cancelDayUpdate();
      return;
    }

    try {
      await update(pendingDayUpdate.subscription.id, {
        dayOfMonth: pendingDayUpdate.targetDay,
      });
      cancelDayUpdate();
    } catch (err) {
      setDayUpdateError(err instanceof Error ? err.message : t.calendar.dayUpdateFailed);
    }
  };

  useEscapeKey(cancelDayUpdate, !!pendingDayUpdate);
  useEscapeKey(() => setShowResetConfirm(false), showResetConfirm);

  const confirmResetData = async (): Promise<void> => {
    try {
      setResettingData(true);
      setResetError(null);

      if (inDemoMode) {
        window.location.reload();
        return;
      }

      await Promise.all(ownedSubscriptions.map((subscription) => remove(subscription.id)));
      await Promise.all(ownedIncomes.map((income) => removeIncome(income.id)));
      await Promise.all(ownedCreditCards.map((card) => removeCreditCard(card.id)));

      setShowResetConfirm(false);
      setSelectedSubscription(null);
      setHoveredSubscription(null);
      setDraggedSubscription(null);
      setDropTargetDayKey(null);
      setPendingDayUpdate(null);
      setDayUpdateError(null);
      setSelectedDay(null);
      setExpandedDayIndexes(new Set());
      setShowSpendingChart(false);
      setShowAddForm(false);
      setEditingSubscription(null);
      setShowImport(false);
      setCurrentDate(new Date());
    } catch (err) {
      setResetError(err instanceof Error ? err.message : t.calendar.resetFailed);
    } finally {
      setResettingData(false);
    }
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
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Function to handle day click (for mobile view)
  const handleDayClick = (
    day: number,
    month: number,
    year: number,
    subscriptions: Subscription[],
    dayIncomes: Income[]
  ) => {
    // Show overlay on mobile when there's any financial activity
    if ((subscriptions.length > 0 || dayIncomes.length > 0) && isMobile) {
      setSelectedDay({ day, month, year, subscriptions, incomes: dayIncomes });
    }
  };

  // Function to close the day overlay
  const closeDayOverlay = () => {
    setSelectedDay(null);
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 max-w-[1700px] mx-auto ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
        <div className="bg-red-500 text-white p-4 rounded mb-4">{error}</div>
        <button onClick={toggleDemoMode} className="text-xs underline">{t.calendar.errorWithDemoFallback}</button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen py-2 sm:py-4">
      <div className={`max-w-[1700px] w-full mx-auto ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"} rounded-lg shadow-lg`}>
        {pendingDayUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className={`w-full max-w-md rounded-xl shadow-2xl p-5 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold">{t.calendar.dayUpdateTitle}</h2>
                  <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {tpl(t.calendar.dayUpdatePrompt, { day: pendingDayUpdate.targetDay })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelDayUpdate}
                  className="text-gray-400 hover:text-gray-200"
                  aria-label={t.calendar.dayUpdateCancel}
                >
                  ✕
                </button>
              </div>

              <div className={`rounded-lg border p-4 ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                <div className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {t.calendar.dayUpdateDiffLabel}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wider text-red-400">{t.calendar.dayUpdateOldLabel}</div>
                    <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-lg text-red-300">
                      {pendingDayUpdate.subscription.dayOfMonth}
                    </div>
                  </div>
                  <div className="text-center text-xl text-gray-400">→</div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wider text-green-400">{t.calendar.dayUpdateNewLabel}</div>
                    <div className="mt-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 font-mono text-lg text-green-300">
                      {pendingDayUpdate.targetDay}
                    </div>
                  </div>
                </div>
                <p className={`mt-3 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {pendingDayUpdate.subscription.name}
                </p>
              </div>

              {dayUpdateError && (
                <p className="mt-3 text-sm text-red-400">{dayUpdateError}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={cancelDayUpdate}
                  className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  {t.calendar.dayUpdateCancel}
                </button>
                <button
                  type="button"
                  onClick={confirmDayUpdate}
                  className="flex-1 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                >
                  {t.calendar.dayUpdateConfirm}
                </button>
              </div>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className={`w-full max-w-md rounded-xl shadow-2xl p-5 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold">{t.calendar.resetTitle}</h2>
                  <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {inDemoMode ? t.calendar.resetDemoPrompt : t.calendar.resetLivePrompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-gray-400 hover:text-gray-200"
                  aria-label={t.calendar.resetCancel}
                >
                  ✕
                </button>
              </div>

              <div className={`rounded-lg border p-4 ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>{t.calendar.resetSubscriptionsLabel}</span>
                    <span className="font-mono">{ownedSubscriptions.length} → 0</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>{t.calendar.resetIncomeLabel}</span>
                    <span className="font-mono">{ownedIncomes.length} → 0</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>{t.calendar.resetCreditCardsLabel}</span>
                    <span className="font-mono">{ownedCreditCards.length} → 0</span>
                  </div>
                </div>
              </div>

              {resetError && (
                <p className="mt-3 text-sm text-red-400">{resetError}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-md text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
                  disabled={resettingData}
                >
                  {t.calendar.resetCancel}
                </button>
                <button
                  type="button"
                  onClick={confirmResetData}
                  className="flex-1 py-2 rounded-md text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                  disabled={resettingData}
                >
                  {resettingData ? t.calendar.resettingLabel : t.calendar.resetConfirm}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedSubscription && (
          <SubscriptionDetail
            subscription={selectedSubscription}
            position={hoverPosition}
            isDarkMode={isDarkMode}
            userLocale={userLocale}
            calculateTotalSpent={calculateTotalSpent}
            positionType="click"
            readOnlyLabel={!isSubscriptionEditable(selectedSubscription) ? t.calendar.sharedReadOnlyLabel : undefined}
            onClose={() => {
              setSelectedSubscription(null);
            }}
            onEdit={
              isSubscriptionEditable(selectedSubscription)
                ? (sub) => {
                    setEditingSubscription(sub);
                    setSelectedSubscription(null);
                  }
                : undefined
            }
            onDelete={
              isSubscriptionEditable(selectedSubscription)
                ? async (id) => {
                    await remove(id);
                    setSelectedSubscription(null);
                  }
                : undefined
            }
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

        {/* Add / Edit subscription form */}
        {(showAddForm || editingSubscription) && (
          <SubscriptionForm
            isDarkMode={isDarkMode}
            subscription={editingSubscription ?? undefined}
            creditCards={creditCards}
            onSave={async (input) => {
              if (editingSubscription) {
                await update(editingSubscription.id, input);
                setEditingSubscription(null);
              } else {
                await add(input);
                setShowAddForm(false);
              }
            }}
            onCancel={() => { setShowAddForm(false); setEditingSubscription(null); }}
          />
        )}

        {/* CSV Import modal */}
        {showImport && (
          <ImportModal
            isDarkMode={isDarkMode}
            existingSubscriptions={ownedSubscriptions}
            existingIncomes={ownedIncomes}
            creditCards={ownedCreditCards}
            onImport={async (inputs) => {
              for (const input of inputs) {
                await add(input);
              }
              setShowImport(false);
            }}
            onImportIncomes={async (inputs) => {
              for (const input of inputs) {
                await addIncome(input);
              }
              setShowImport(false);
            }}
            onCancel={() => setShowImport(false)}
          />
        )}

        {/* Day Subscriptions Overlay (for mobile) */}
        {selectedDay && (
          <DaySubscriptionsOverlay
            day={selectedDay.day}
            month={selectedDay.month}
            year={selectedDay.year}
            subscriptions={selectedDay.subscriptions}
            incomes={selectedDay.incomes}
            userLocale={userLocale}
            isDarkMode={isDarkMode}
            onClose={closeDayOverlay}
            onSubscriptionClick={handleSubscriptionClick}
          />
        )}

        {/* Spending Chart */}
        <SpendingChart
          subscriptions={getActiveSubscriptionsForMonth()}
          totalSpend={calculateRawMonthlyTotal()}
          userLocale={userLocale}
          isDarkMode={isDarkMode}
          isVisible={showSpendingChart}
          onClose={() => setShowSpendingChart(false)}
        />

        {/* Income Chart */}
        <IncomeChart
          incomes={getActiveIncomesForMonth()}
          totalIncome={calculateRawMonthlyIncomeTotal()}
          userLocale={userLocale}
          isDarkMode={isDarkMode}
          isVisible={showIncomeChart}
          onClose={() => setShowIncomeChart(false)}
        />

        <div className="p-3 sm:p-4 md:p-6">
          {/* Utility bar: theme + language + sign-out */}
          <div className="flex justify-end items-center gap-2 mb-3">
            {!inDemoMode && (
              <button
                onClick={handleSignOut}
                className="h-8 px-2.5 rounded-full border border-gray-600 hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs text-gray-300"
                aria-label={t.nav.signOut}
                title={t.nav.signOut}
              >
                <span>↩</span>
                <span className="hidden sm:inline">{t.nav.signOut}</span>
              </button>
            )}
            <button
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-full border border-gray-600 hover:bg-gray-700 transition-colors flex items-center justify-center text-base leading-none"
              aria-label={isDarkMode ? t.nav.switchToLightMode : t.nav.switchToDarkMode}
              title={isDarkMode ? t.nav.switchToLightMode : t.nav.switchToDarkMode}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            <LanguageSwitcher isDarkMode={isDarkMode} />
          </div>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-5 gap-4">
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
                {getMonthName(currentDate.getMonth())}{" "}{currentDate.getFullYear()}
              </h1>
            </div>

            <div className="w-full xl:w-auto flex flex-col sm:flex-row sm:items-start gap-3">
              <div
                className="text-left sm:text-right cursor-pointer group relative sm:min-w-[220px]"
                onClick={() => setShowSpendingChart(true)}
                onMouseEnter={() => window.innerWidth > 768 && setShowSpendingChart(true)}
              >
                <div className="text-xs sm:text-sm text-gray-400">{t.nav.monthlySpend}</div>
                <div className="text-lg sm:text-2xl font-bold group-hover:text-blue-500 transition-colors">
                  {calculateMonthlyTotal()}
                  <span className="hidden group-hover:inline-block ml-2 text-xs">📊</span>
                </div>
              </div>

              <div
                className="text-left sm:text-right cursor-pointer group relative sm:min-w-[180px]"
                onClick={() => setShowIncomeChart(true)}
                onMouseEnter={() => window.innerWidth > 768 && setShowIncomeChart(true)}
              >
                <div className="text-xs sm:text-sm text-gray-400">{t.nav.monthlyIncome}</div>
                <div className="text-lg sm:text-2xl font-bold text-green-400 group-hover:text-green-300 transition-colors">
                  {calculateMonthlyIncomeTotal()}
                  <span className="hidden group-hover:inline-block ml-2 text-xs">📊</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium text-left"
                >
                  ➕ {t.nav.addSubscriptionButton}
                </button>
                {!inDemoMode && (
                  <button
                    onClick={() => setShowImport(true)}
                    className="px-3 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors text-sm font-medium text-left"
                  >
                    ⬆️ {t.nav.importFromCsv}
                  </button>
                )}
                <button
                  onClick={toggleDemoMode}
                  className="px-3 py-2 rounded-md border border-gray-600 hover:bg-gray-700 transition-colors text-sm font-medium text-left"
                >
                  {inDemoMode ? `🔴 ${t.nav.exitDemoMode}` : `🔍 ${t.nav.enterDemoMode}`}
                </button>
                {!inDemoMode && (
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 rounded-md border border-gray-600 hover:bg-gray-700 transition-colors text-sm font-medium text-left text-gray-200"
                  >
                    ↩️ {t.nav.signOut}
                  </button>
                )}
              </div>
            </div>
          </div>

          {inDemoMode && (
            <div className="mb-4 p-2 bg-purple-800 bg-opacity-20 border border-purple-600 rounded-md text-purple-400 flex flex-wrap items-center">
              <span className="mr-2">🔍</span>
              <span className="text-sm">{t.nav.demoModeActive}</span>
              <button onClick={toggleDemoMode} className="text-xs underline ml-auto">{t.nav.exitDemoLink}</button>
            </div>
          )}

          {!inDemoMode && sharedSubscriptions.length > 0 && (
            <div className="mb-4 p-2 bg-amber-800 bg-opacity-20 border border-amber-600 rounded-md text-amber-300 text-sm">
              {tpl(t.calendar.sharedReadOnlyInfo, { count: sharedSubscriptions.length })}
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

          <div className="grid grid-cols-7 gap-1 items-start">
            {renderCalendar().map((dayObj, index) => {
              const dayKey = `${dayObj.year}-${dayObj.month}-${dayObj.day}`;
              const daySubscriptions = dayObj.isCurrentMonth
                ? getSubscriptionsForDay(
                    dayObj.day,
                    subscriptions,
                    userLocale,
                    currentDate.getMonth(),
                    currentDate.getFullYear()
                  )
                : [];
              const dayIncomes = dayObj.isCurrentMonth
                ? getIncomesForDay(
                    dayObj.day,
                    incomes,
                    userLocale,
                    currentDate.getMonth(),
                    currentDate.getFullYear()
                  )
                : [];
              const isGrayed = !dayObj.isCurrentMonth;

              const fin = dayFinancials[dayObj.day] ?? { expenseTotal: 0, incomeTotal: 0 };
              const net = fin.incomeTotal - fin.expenseTotal;
              const hasBoth = fin.incomeTotal > 0 && fin.expenseTotal > 0;

              let tintColor: string | undefined;
              if (!isGrayed && (fin.expenseTotal > 0 || fin.incomeTotal > 0)) {
                const MAX_OPACITY = 0.22;
                if (net < 0) {
                  const intensity = maxExpenseDay > 0 ? Math.min(Math.abs(net) / maxExpenseDay, 1) * MAX_OPACITY : MAX_OPACITY;
                  tintColor = `rgba(239,68,68,${intensity.toFixed(3)})`;
                } else {
                  const intensity = maxIncomeDay > 0 ? Math.min(net / maxIncomeDay, 1) * MAX_OPACITY : MAX_OPACITY;
                  tintColor = `rgba(34,197,94,${intensity.toFixed(3)})`;
                }
              }

              const isExpanded = expandedDayIndexes.has(dayKey);

              return (
                <div
                  key={`${dayKey}-${index}`}
                  className={`rounded-md ${isExpanded ? styles.calendarDayExpanded : styles.calendarDay} ${
                    isDarkMode ? "bg-gray-800" : "bg-gray-100"
                  } ${isGrayed ? "opacity-40" : ""} ${
                    dayObj.isToday ? "ring-2 ring-blue-500" : ""
                  } ${
                    dropTargetDayKey === dayKey ? "ring-2 ring-green-500 ring-offset-1 ring-offset-transparent" : ""
                  }`}
                  onDragEnter={(event) => handleDayDragOver(event, dayKey)}
                  onDragOver={(event) => handleDayDragOver(event, dayKey)}
                  onDrop={(event) => handleDayDrop(event, dayObj)}
                  onClick={() => {
                    if (isExpanded) {
                      toggleDayExpansion(dayKey);
                      return;
                    }
                    if (isMobile) {
                      handleDayClick(
                        dayObj.day,
                        dayObj.month,
                        dayObj.year,
                        daySubscriptions,
                        dayIncomes
                      );
                    }
                  }}
                >
                  <div className={isExpanded ? styles.calendarDayContentExpanded : styles.calendarDayContent}>
                    {tintColor && (
                      <div
                        className="absolute inset-0 rounded-md pointer-events-none"
                        style={{ backgroundColor: tintColor, zIndex: 0 }}
                      />
                    )}

                    <div className="text-right font-medium mb-1">
                      {dayObj.day}
                    </div>

                    {(daySubscriptions.length > 0 || dayIncomes.length > 0) && (
                      <DayIcons
                        daySubscriptions={daySubscriptions}
                        dayIncomes={dayIncomes}
                        expandedDays={expandedDayIndexes}
                        dayKey={dayKey}
                        handleSubscriptionHover={handleSubscriptionHover}
                        handleSubscriptionLeave={handleSubscriptionLeave}
                        handleSubscriptionClick={handleSubscriptionClick}
                        handleSubscriptionDragStart={handleSubscriptionDragStart}
                        handleSubscriptionDragEnd={handleSubscriptionDragEnd}
                        isSubscriptionEditable={isSubscriptionEditable}
                        readOnlySuffixLabel={t.calendar.readOnlySuffix}
                        toggleDayExpansion={toggleDayExpansion}
                      />
                    )}

                    {!isGrayed && (fin.expenseTotal > 0 || fin.incomeTotal > 0) && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-md overflow-hidden flex" style={{ zIndex: 2 }}>
                        {fin.incomeTotal > 0 && (
                          <div
                            className="h-full cursor-default"
                            title={`+ ${fmtAmount(fin.incomeTotal)}`}
                            style={{
                              width: hasBoth
                                ? `${(fin.incomeTotal / (fin.incomeTotal + fin.expenseTotal) * 100).toFixed(1)}%`
                                : '100%',
                              backgroundColor: 'rgba(34,197,94,0.85)',
                            }}
                          />
                        )}
                        {fin.expenseTotal > 0 && (
                          <div
                            className="h-full flex-1 cursor-default"
                            title={`− ${fmtAmount(fin.expenseTotal)}`}
                            style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("operations")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                activeTab === "operations"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "border-gray-600 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {t.calendar.tabOperations}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("insights")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                activeTab === "insights"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "border-gray-600 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {t.calendar.tabInsights}
            </button>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {activeTab === "operations" && (
              <>
                <MonthlySummaryTable
                  subscriptions={subscriptions}
                  month={currentDate.getMonth()}
                  year={currentDate.getFullYear()}
                  userLocale={userLocale}
                  isDarkMode={isDarkMode}
                  onSubscriptionClick={handleSubscriptionClick}
                  onSubscriptionHover={handleSubscriptionHover}
                  onSubscriptionLeave={handleSubscriptionLeave}
                  onDayClick={(day, month, year, daySubscriptions) => {
                    handleDayClick(day, month, year, daySubscriptions, []);
                  }}
                />

                <IncomeManager
                  incomes={ownedIncomes}
                  isDarkMode={isDarkMode}
                  userLocale={userLocale}
                  onAdd={addIncome}
                  onUpdate={updateIncome}
                  onRemove={removeIncome}
                />

                <CreditCardManager
                  creditCards={ownedCreditCards}
                  subscriptions={ownedSubscriptions}
                  isDarkMode={isDarkMode}
                  onAdd={addCreditCard}
                  onUpdate={updateCreditCard}
                  onRemove={removeCreditCard}
                />

                <SharingManager
                  shares={shares}
                  isDarkMode={isDarkMode}
                  onAdd={async (viewerEmail) => addShare({ viewerEmail })}
                  onRemove={removeShare}
                />

                <CashFlowProjection
                  subscriptions={subscriptions}
                  incomes={incomes}
                  isDarkMode={isDarkMode}
                  userLocale={userLocale}
                />
              </>
            )}

            {activeTab === "insights" && (
              <>
                <SubscriptionTrends
                  subscriptions={subscriptions}
                  userLocale={userLocale}
                  isDarkMode={isDarkMode}
                  lastFetchTime={lastFetchTime}
                  currentMonth={currentDate.getMonth()}
                  currentYear={currentDate.getFullYear()}
                />

                <YearlyProjection
                  subscriptions={subscriptions}
                  userLocale={userLocale}
                  isDarkMode={isDarkMode}
                />
              </>
            )}
          </div>

          {/* Reset button — kept at the very bottom, away from destructive-action accidents */}
          <div className="mt-6 pt-4 border-t border-gray-700/40 flex justify-end">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-2 rounded-md border border-red-700/60 hover:bg-red-900/40 transition-colors text-sm font-medium text-red-400"
            >
              ↺ {inDemoMode ? t.nav.resetDemoData : t.nav.resetData}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCalendar;
