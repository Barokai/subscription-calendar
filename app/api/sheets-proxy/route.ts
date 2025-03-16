import { NextRequest, NextResponse } from 'next/server';

type SheetProxyRequest = {
  spreadsheetId: string;
  range: string;
  useEnvSpreadsheetId?: boolean;
  useEnvApiKey?: boolean;
  apiKey?: string; // Only used if not using env API key
};

/**
 * Server-side proxy for Google Sheets API requests
 * This allows us to use environment variables securely without exposing them to the client
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      spreadsheetId: clientSpreadsheetId, 
      range,
      useEnvSpreadsheetId,
      useEnvApiKey,
      apiKey: clientApiKey
    }: SheetProxyRequest = await request.json();
    
    // Use environment variables when specified
    const spreadsheetId = useEnvSpreadsheetId 
      ? process.env.SHEETS_SPREADSHEET_ID 
      : clientSpreadsheetId;
      
    const apiKey = useEnvApiKey
      ? process.env.SHEETS_API_KEY
      : clientApiKey;

    // Validate configuration
    if (!spreadsheetId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required configuration values' },
        { status: 400 }
      );
    }

    // Construct Google Sheets API URL
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    
    // Make the API request from the server
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    // Return the spreadsheet data
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in sheets-proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Google Sheets API' },
      { status: 500 }
    );
  }
}
