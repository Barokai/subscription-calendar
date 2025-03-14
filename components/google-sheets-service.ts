// Service to handle Google Sheets API interactions

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
}

// Demo data for when no Google Sheets connection is available
export const mockSubscriptions: Subscription[] = [
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

interface SheetResponse {
  values: string[][];
  [key: string]: unknown;
}

/**
 * Fetch subscription data from Google Sheets
 * @param spreadsheetId - The ID of the Google Spreadsheet
 * @param apiKey - Google API Key
 * @returns Promise with subscription data
 */
export const fetchSubscriptions = async (
  spreadsheetId: string, 
  apiKey: string
): Promise<Subscription[]> => {
  const range = 'A:H'; // Assume data is in columns A-H
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const json = await response.json();
      throw new Error(`API request failed with status ${response.status}, error.code ${json.error.code}, error.message: ${json.error.message}`);
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
    const dayOfMonthIndex = headers.indexOf('dayofmonth');
    const colorIndex = headers.indexOf('color');
    const logoIndex = headers.indexOf('logo');
    const startDateIndex = headers.indexOf('startdate');
    
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
        const amount = parseFloat(row[amountIndex]);
        const currency = row[currencyIndex];
        const frequency = row[frequencyIndex];
        const dayOfMonth = parseInt(row[dayOfMonthIndex], 10);
        const color = row[colorIndex];
        const logo = row[logoIndex];
        const startDate = row[startDateIndex];
        
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
        
        // Create a subscription object
        return {
          id: index,
          name,
          amount,
          currency,
          frequency,
          dayOfMonth,
          color,
          logo,
          startDate
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
