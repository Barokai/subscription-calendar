import type { NextApiRequest, NextApiResponse } from 'next';

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
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      spreadsheetId: clientSpreadsheetId, 
      range,
      useEnvSpreadsheetId,
      useEnvApiKey,
      apiKey: clientApiKey
    } = req.body as SheetProxyRequest;
    
    // Use environment variables when specified
    const spreadsheetId = useEnvSpreadsheetId 
      ? process.env.SHEETS_SPREADSHEET_ID 
      : clientSpreadsheetId;
      
    const apiKey = useEnvApiKey
      ? process.env.SHEETS_API_KEY
      : clientApiKey;

    // Validate configuration
    if (!spreadsheetId || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required configuration values' 
      });
    }

    // Construct Google Sheets API URL
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    
    // Make the API request from the server
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
    
    // Return the spreadsheet data
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in sheets-proxy:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch data from Google Sheets API' 
    });
  }
}
