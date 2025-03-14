import type { NextApiRequest, NextApiResponse } from 'next';

type SheetsConnectRequest = {
  // Client-side override values, used if provided
  spreadsheetId?: string;
  apiKey?: string;
  // Whether to use environment values
  useEnvSpreadsheetId?: boolean;
  useEnvApiKey?: boolean;
};

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
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SheetsConnectResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { 
    spreadsheetId: clientSpreadsheetId, 
    apiKey: clientApiKey,
    useEnvSpreadsheetId,
    useEnvApiKey 
  } = req.body as SheetsConnectRequest;
  
  // Determine which values to use (environment or client-provided)
  const spreadsheetId = useEnvSpreadsheetId 
    ? process.env.SHEETS_SPREADSHEET_ID 
    : clientSpreadsheetId;

  const apiKey = useEnvApiKey 
    ? process.env.SHEETS_API_KEY 
    : clientApiKey;

  // Validation
  if (!spreadsheetId || !apiKey) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required configuration values' 
    });
  }

  // Here you could test the connection to verify the credentials work
  // For now, we'll just assume they're valid

  return res.status(200).json({ 
    success: true, 
    spreadsheetId: spreadsheetId,
    hasApiKey: !!apiKey
  });
}
