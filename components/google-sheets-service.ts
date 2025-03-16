// Service to handle Google Sheets API interactions

import { formatISODate } from "./date-utils";
import { mockSubscriptions } from "../data/mock-subscriptions";

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  originalFrequency: string; // Keep the original frequency value
  dayOfMonth: number;
  color: string;
  logo: string;
  startDate: string;
  endDate?: string; // Optional end date for subscriptions that have terminated
}

// Export the mock subscriptions from the dedicated file
export { mockSubscriptions };

interface SheetResponse {
  values: string[][];
  [key: string]: unknown;
}

/**
 * Normalize subscription frequency
 * @param frequency - The frequency string from the spreadsheet
 * @returns Normalized frequency string
 */
export const normalizeFrequency = (frequency: string): string => {
  const lowerFreq = frequency.toLowerCase().trim();

  if (
    lowerFreq === "yearly" ||
    lowerFreq === "annual" ||
    lowerFreq === "annually"
  ) {
    return "yearly";
  }

  if (lowerFreq === "quarterly" || lowerFreq === "quarter") {
    return "quarterly";
  }

  if (
    lowerFreq === "biannually" ||
    lowerFreq === "semi-annually" ||
    lowerFreq === "half-yearly"
  ) {
    return "biannually";
  }

  if (lowerFreq === "weekly") {
    return "weekly";
  }

  if (
    lowerFreq === "biweekly" ||
    lowerFreq === "bi-weekly" ||
    lowerFreq === "fortnightly"
  ) {
    return "biweekly";
  }

  if (lowerFreq === "daily") {
    return "daily";
  }

  // Default to monthly if not recognized
  return "monthly";
};

/**
 * Get subscription payment months based on frequency and start date
 * @param frequency - Normalized frequency
 * @param startDate - When the subscription started
 * @param currentMonth - The month we're currently viewing (0-11)
 * @param currentYear - The year we're currently viewing
 * @returns Whether the subscription should show in this month
 */
export const isPaymentInMonth = (
  frequency: string,
  startDate: Date,
  currentMonth: number,
  currentYear: number
): boolean => {
  // Ensure startDate is valid
  if (isNaN(startDate.getTime())) {
    console.warn("Invalid startDate in isPaymentInMonth:", startDate);
    return false;
  }
  
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  // Calculate total months difference from start date to current view
  const totalMonthsDiff =
    (currentYear - startYear) * 12 + (currentMonth - startMonth);

  // If we're viewing a month before the subscription started, it can't be in this month
  if (totalMonthsDiff < 0) {
    return false;
  }

  switch (frequency) {
    case "yearly":
      // Payment occurs in the same month every year
      return currentMonth === startMonth && totalMonthsDiff % 12 === 0;

    case "quarterly":
      // Payment every 3 months
      return totalMonthsDiff % 3 === 0;

    case "biannually":
      // Payment every 6 months
      return totalMonthsDiff % 6 === 0;

    case "monthly":
      // Payment every month
      return true;

    case "weekly":
    case "biweekly":
      // Weekly and biweekly payments happen multiple times each month
      // We'll show them in all months
      return true;

    case "daily":
      // Daily payments happen in all months
      return true;

    default:
      return true; // Default to showing the subscription
  }
};

/**
 * Helper function to parse date in various formats
 */
const parseDateSafely = (dateString: string): Date | null => {
  // ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }
  
  // European format (DD.MM.YYYY)
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateString)) {
    const parts = dateString.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed months
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // US format (MM/DD/YYYY)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const parts = dateString.split('/');
    const month = parseInt(parts[0], 10) - 1; // 0-indexed months
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Try with built-in parsing as last resort
  const date = new Date(dateString);
  return !isNaN(date.getTime()) ? date : null;
};

/**
 * Fetch subscription data from Google Sheets
 * @param spreadsheetId - The ID of the Google Spreadsheet
 * @param apiKey - Google API Key
 * @param useEnvSpreadsheetId - Whether to use the environment variable for spreadsheet ID
 * @param useEnvApiKey - Whether to use the environment variable for API key
 * @returns Promise with subscription data
 */
export const fetchSubscriptions = async (
  spreadsheetId: string,
  apiKey: string,
  useEnvSpreadsheetId: boolean = false,
  useEnvApiKey: boolean = false
): Promise<Subscription[]> => {
  const range = "A:I"; // Updated to include potential endDate column

  try {
    // Use our server-side proxy instead of calling Google Sheets API directly
    const response = await fetch("/api/sheets-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheetId,
        range,
        useEnvSpreadsheetId,
        useEnvApiKey,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API request failed with status ${response.status}, error: ${
          errorData.error?.message || JSON.stringify(errorData)
        }`
      );
    }

    const data = (await response.json()) as SheetResponse;

    // Check if we have values
    if (!data.values || data.values.length <= 1) {
      throw new Error("No data found in the spreadsheet");
    }

    // Parse the header row to determine column positions
    const headers = data.values[0].map((header: string) =>
      header.toLowerCase()
    );

    // Define expected columns
    const nameIndex = headers.indexOf("name");
    const amountIndex = headers.indexOf("amount");
    const currencyIndex = headers.indexOf("currency");
    const frequencyIndex = headers.indexOf("frequency");
    const dayOfMonthIndex = headers.indexOf("day of month");
    const colorIndex = headers.indexOf("color");
    const logoIndex = headers.indexOf("logo");
    const startDateIndex = headers.indexOf("start date");
    const endDateIndex = headers.indexOf("end date"); // Add support for the optional end date

    // Check if all required columns exist
    if (
      nameIndex === -1 ||
      amountIndex === -1 ||
      currencyIndex === -1 ||
      frequencyIndex === -1 ||
      dayOfMonthIndex === -1 ||
      colorIndex === -1 ||
      logoIndex === -1 ||
      startDateIndex === -1
    ) {
      throw new Error("Spreadsheet is missing required columns");
    }

    // Parse the data rows
    const subscriptions: Subscription[] = data.values
      .slice(1)
      .map((row: string[], index: number): Subscription | null => {
        // Validate the row has enough columns
        if (
          row.length <=
          Math.max(
            nameIndex,
            amountIndex,
            currencyIndex,
            frequencyIndex,
            dayOfMonthIndex,
            colorIndex,
            logoIndex,
            startDateIndex
          )
        ) {
          console.warn(`Row ${index + 1} has missing data, skipping`);
          return null;
        }

        // Get values from the row
        const name = row[nameIndex];
        const amount = parseFloat(row[amountIndex].replace(",", "."));
        const currency = row[currencyIndex];
        const frequency = row[frequencyIndex];
        const dayOfMonth = parseInt(row[dayOfMonthIndex], 10);
        const color = row[colorIndex];
        const logo = row[logoIndex];
        const startDate = row[startDateIndex];
        // Get optional end date if it exists
        const endDate =
          endDateIndex !== -1 && row[endDateIndex]
            ? row[endDateIndex]
            : undefined;

        // Validate all required fields exist and are valid
        if (
          !name ||
          isNaN(amount) ||
          !currency ||
          !frequency ||
          isNaN(dayOfMonth) ||
          !color ||
          !logo ||
          !startDate
        ) {
          console.warn(`Row ${index + 1} has invalid data, skipping`);
          return null;
        }

        // Normalize frequency only (no monthly equivalent needed)
        const normalizedFrequency = normalizeFrequency(frequency);

        // Create a subscription object with normalized dates
        let normalizedStartDate: string;
        
        // Handle the start date
        const parsedDate = parseDateSafely(startDate);
        if (parsedDate) {
          normalizedStartDate = formatISODate(parsedDate);
        } else {
          console.warn(`Failed to parse start date: ${startDate} for row ${index + 1}`);
          normalizedStartDate = startDate; // Keep as is if parsing fails
        }
        
        // Handle the end date if provided
        let normalizedEndDate: string | undefined = undefined;
        if (endDate) {
          const parsedEndDate = parseDateSafely(endDate);
          if (parsedEndDate) {
            normalizedEndDate = formatISODate(parsedEndDate);
          } else {
            normalizedEndDate = endDate; // Keep as is if parsing fails
          }
        }

        return {
          id: index,
          name,
          amount,
          currency,
          frequency: normalizedFrequency,
          originalFrequency: frequency,
          dayOfMonth,
          color,
          logo,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
        };
      })
      .filter((sub): sub is Subscription => sub !== null);

    if (subscriptions.length === 0) {
      throw new Error("No valid subscription data found in the spreadsheet");
    }

    return subscriptions;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    throw error;
  }
};
