// Service to handle Google Sheets API interactions

import { formatISODate } from './date-utils';
import { mockSubscriptions } from '../data/mock-subscriptions';

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
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
  const range = 'A:I'; // Updated to include potential endDate column
  
  try {
    // Use our server-side proxy instead of calling Google Sheets API directly
    const response = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId,
        range,
        useEnvSpreadsheetId,
        useEnvApiKey,
        apiKey
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
    
    const data = await response.json() as SheetResponse;
    
    // Check if we have values
    if (!data.values || data.values.length <= 1) {
      throw new Error('No data found in the spreadsheet');
    }
    
    // Parse the header row to determine column positions
    const headers = data.values[0].map((header: string) => header.toLowerCase());
    
    // Define expected columns
    const nameIndex = headers.indexOf('name');
    const amountIndex = headers.indexOf('amount');
    const currencyIndex = headers.indexOf('currency');
    const frequencyIndex = headers.indexOf('frequency');
    const dayOfMonthIndex = headers.indexOf('day of month');
    const colorIndex = headers.indexOf('color');
    const logoIndex = headers.indexOf('logo');
    const startDateIndex = headers.indexOf('start date');
    const endDateIndex = headers.indexOf('end date'); // Add support for the optional end date
    
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
      throw new Error('Spreadsheet is missing required columns');
    }
    
    // Parse the data rows
    const subscriptions: Subscription[] = data.values.slice(1)
      .map((row: string[], index: number): Subscription | null => {
        // Validate the row has enough columns
        if (row.length <= Math.max(
          nameIndex, amountIndex, currencyIndex, frequencyIndex, 
          dayOfMonthIndex, colorIndex, logoIndex, startDateIndex
        )) {
          console.warn(`Row ${index + 1} has missing data, skipping`);
          return null;
        }
        
        // Get values from the row
        const name = row[nameIndex];
        const amount = parseFloat(row[amountIndex].replace(',', '.'));
        const currency = row[currencyIndex];
        const frequency = row[frequencyIndex];
        const dayOfMonth = parseInt(row[dayOfMonthIndex], 10);
        const color = row[colorIndex];
        const logo = row[logoIndex];
        const startDate = row[startDateIndex];
        // Get optional end date if it exists
        const endDate = endDateIndex !== -1 && row[endDateIndex] ? row[endDateIndex] : undefined;
        
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
        
        // Create a subscription object with normalized dates
        const parsedStartDate = new Date(startDate);
        const normalizedStartDate = !isNaN(parsedStartDate.getTime()) 
          ? formatISODate(parsedStartDate) 
          : startDate;
        
        // Process the optional end date if it exists
        let normalizedEndDate: string | undefined = undefined;
        if (endDate) {
          const parsedEndDate = new Date(endDate);
          normalizedEndDate = !isNaN(parsedEndDate.getTime())
            ? formatISODate(parsedEndDate)
            : endDate;
        }
        
        return {
          id: index,
          name,
          amount,
          currency,
          frequency,
          dayOfMonth,
          color,
          logo,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate
        };
      })
      .filter((sub): sub is Subscription => sub !== null);
    
    if (subscriptions.length === 0) {
      throw new Error('No valid subscription data found in the spreadsheet');
    }
    
    return subscriptions;
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    throw error;
  }
};
