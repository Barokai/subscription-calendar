import { NextResponse } from 'next/server';

/**
 * API route that safely checks if server-side environment variables are available
 * without exposing their actual values to the client
 */
export async function GET() {
  // Only check if environment variables exist, don't expose actual values
  const hasEnvSpreadsheetId = !!process.env.SHEETS_SPREADSHEET_ID;
  const hasEnvApiKey = !!process.env.SHEETS_API_KEY;

  return NextResponse.json({
    hasEnvSpreadsheetId,
    hasEnvApiKey
  });
}
