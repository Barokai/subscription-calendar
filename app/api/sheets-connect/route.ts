import { NextRequest, NextResponse } from 'next/server';

type SheetsConnectRequest = {
  // Client-side override values, used if provided
  spreadsheetId?: string;
  apiKey?: string;
  // Whether to use environment values
  useEnvSpreadsheetId?: boolean;
  useEnvApiKey?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SheetsConnectResponse = {
  success: boolean;
  message?: string;
  spreadsheetId?: string;
  hasApiKey?: boolean;
};

/**
 * API route that handles Google Sheets connection using environment variables
 * when specified, falling back to client-provided values when needed
 */
export async function POST(request: NextRequest) {
  const { 
    spreadsheetId: clientSpreadsheetId, 
    apiKey: clientApiKey,
    useEnvSpreadsheetId,
    useEnvApiKey 
  }: SheetsConnectRequest = await request.json();
  
  // Determine which values to use (environment or client-provided)
  const spreadsheetId = useEnvSpreadsheetId 
    ? process.env.SHEETS_SPREADSHEET_ID 
    : clientSpreadsheetId;

  const apiKey = useEnvApiKey 
    ? process.env.SHEETS_API_KEY 
    : clientApiKey;

  // Validation
  if (!spreadsheetId || !apiKey) {
    return NextResponse.json({ 
      success: false, 
      message: 'Missing required configuration values' 
    }, { status: 400 });
  }

  // Here you could test the connection to verify the credentials work
  // For now, we'll just assume they're valid

  return NextResponse.json({ 
    success: true, 
    spreadsheetId: spreadsheetId,
    hasApiKey: !!apiKey
  });
}
