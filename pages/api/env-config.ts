import type { NextApiRequest, NextApiResponse } from 'next';

type EnvConfigResponse = {
  hasEnvSpreadsheetId: boolean;
  hasEnvApiKey: boolean;
};

/**
 * API route that safely checks if server-side environment variables are available
 * without exposing their actual values to the client
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnvConfigResponse>
) {
  // Only check if environment variables exist, don't expose actual values
  const hasEnvSpreadsheetId = !!process.env.SHEETS_SPREADSHEET_ID;
  const hasEnvApiKey = !!process.env.SHEETS_API_KEY;

  res.status(200).json({
    hasEnvSpreadsheetId,
    hasEnvApiKey
  });
}
