import React, { useState, useEffect } from 'react';

interface SetupInstructionsProps {
  isDarkMode: boolean;
  userLocale: string;
  spreadsheetId?: string;
  apiKey?: string;
  hasEnvSpreadsheetId?: boolean;
  hasEnvApiKey?: boolean;
  useEnvSpreadsheetId?: boolean;
  useEnvApiKey?: boolean;
  onSaveSettings: (spreadsheetId: string, apiKey: string, locale: string, useEnvSpreadsheetId: boolean, useEnvApiKey: boolean) => void;
  onCancel: () => void;
}

const SetupInstructions: React.FC<SetupInstructionsProps> = ({
  isDarkMode,
  userLocale,
  spreadsheetId = '',
  apiKey = '',
  hasEnvSpreadsheetId = false,
  hasEnvApiKey = false,
  useEnvSpreadsheetId = false,
  useEnvApiKey = false,
  onSaveSettings,
  onCancel
}) => {
  // Local state for toggling environment variables
  const [useEnvSheet, setUseEnvSheet] = useState(useEnvSpreadsheetId);
  const [useEnvKey, setUseEnvKey] = useState(useEnvApiKey);
  
  // Update local state when props change
  useEffect(() => {
    setUseEnvSheet(useEnvSpreadsheetId);
    setUseEnvKey(useEnvApiKey);
  }, [useEnvSpreadsheetId, useEnvApiKey]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    // Get values from form
    const sheetIdValue = useEnvSheet ? '' : (form.elements.namedItem('spreadsheetId') as HTMLInputElement).value;
    const apiKeyValue = useEnvKey ? '' : (form.elements.namedItem('apiKey') as HTMLInputElement).value;
    const locale = (form.elements.namedItem('locale') as HTMLSelectElement).value;
    
    // First verify the connection works via the API
    try {
      const response = await fetch('/api/sheets-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: sheetIdValue,
          apiKey: apiKeyValue,
          useEnvSpreadsheetId: useEnvSheet,
          useEnvApiKey: useEnvKey
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Save settings if connection successful
        onSaveSettings(sheetIdValue, apiKeyValue, locale, useEnvSheet, useEnvKey);
      } else {
        // Handle connection error
        alert('Could not connect to Google Sheets. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error connecting to Google Sheets:', error);
      alert('An error occurred while connecting to Google Sheets');
    }
  };

  return (
    <div className={`p-6 rounded-lg mb-4 shadow-lg max-w-3xl mx-auto ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-4">Google Sheets Integration Setup</h2>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Step 1: Create a Google Sheet</h3>
        <p className="">Share the sheet to "anyone with the link"</p>
        <p className="mb-3">Create a Google Sheet with the following columns:</p>
        <ul className="list-disc ml-6 mb-4">
          <li>name - The subscription name (e.g., Netflix)</li>
          <li>amount - The cost of the subscription</li>
          <li>currency - The currency symbol (e.g., €)</li>
          <li>frequency - How often the subscription renews (e.g., monthly)</li>
          <li>day of month - The day of the month when payment is due</li>
          <li>color - The brand color in hex format (e.g., #E50914 for Netflix)</li>
          <li>logo - A letter or short text to represent the logo</li>
          <li>start date - When you first subscribed (YYYY-MM-DD format)</li>
        </ul>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Step 2: Enable Google Sheets API</h3>
        <ol className="list-decimal ml-6 mb-4">
          <li>Go to the <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Developers Console</a></li>
          <li>Create a new project or select an existing one</li>
          <li>Enable the Google Sheets API</li>
          <li>Create an API key</li>
          <li>Copy your API key and spreadsheet ID (the long string in your spreadsheet URL)</li>
        </ol>
      </div>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-medium">Spreadsheet ID:</label>
            {hasEnvSpreadsheetId && (
              <div className="flex items-center">
                <label className="text-sm mr-2">Use environment value</label>
                <input 
                  type="checkbox" 
                  checked={useEnvSheet} 
                  onChange={(e) => setUseEnvSheet(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            )}
          </div>
          
          {useEnvSheet ? (
            <div className={`w-full p-2 border-2 rounded-md flex justify-between items-center ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
              <span className="opacity-75 italic">Using environment variable</span>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">ENV</span>
            </div>
          ) : (
            <input 
              type="text" 
              name="spreadsheetId" 
              className={`w-full p-2 border-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
              placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              defaultValue={spreadsheetId !== '' ? spreadsheetId : ''}
              required={!useEnvSheet}
            />
          )}
          
          {(spreadsheetId || useEnvSheet) && (
            <div className="text-xs text-green-500 mt-1">
              ✓ Current spreadsheet ID is set {useEnvSheet && '(from environment)'}
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-medium">API Key:</label>
            {hasEnvApiKey && (
              <div className="flex items-center">
                <label className="text-sm mr-2">Use environment value</label>
                <input 
                  type="checkbox" 
                  checked={useEnvKey} 
                  onChange={(e) => setUseEnvKey(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            )}
          </div>
          
          {useEnvKey ? (
            <div className={`w-full p-2 border-2 rounded-md flex justify-between items-center ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
              <span className="opacity-75 italic">Using environment variable</span>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">ENV</span>
            </div>
          ) : (
            <input 
              type="text" 
              name="apiKey" 
              className={`w-full p-2 border-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
              placeholder="e.g., AIzaSyBJH3s..."
              defaultValue={apiKey !== '' ? apiKey : ''}
              required={!useEnvKey}
            />
          )}
          
          {(apiKey || useEnvKey) && (
            <div className="text-xs text-green-500 mt-1">
              ✓ Current API key is set {useEnvKey && '(from environment)'}
            </div>
          )}
        </div>
        
        <div>
          <label className="block mb-1 font-medium">Locale:</label>
          <select 
            name="locale" 
            className={`w-full p-2 border-2 rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            defaultValue={userLocale}
            style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white' }}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="de-DE">German</option>
            <option value="es-ES">Spanish</option>
            <option value="it-IT">Italian</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1 transition-colors"
          >
            {spreadsheetId || apiKey || useEnvSheet || useEnvKey ? 'Update Connection' : 'Connect'}
          </button>
          
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SetupInstructions;
