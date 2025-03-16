"use client";
import React, { useState, useEffect } from 'react';

interface DebugInformation {
  url: string;
  userAgent: string;
  screenSize: string;
  localStorage: Record<string, string | null>;
  queryParams: Record<string, string>;
}

const DebugInfo: React.FC = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInformation | null>(null);

  useEffect(() => {
    // Check if we should show debug info
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get('debug') === 'true';
    setIsDebugMode(debug);

    if (debug) {
      // Collect debug information
      const localStorageData: Record<string, string | null> = {};
      const queryParamsData: Record<string, string> = {};

      // Get localStorage items (safely)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            localStorageData[key] = localStorage.getItem(key);
          }
        }
      } catch (error) {
        localStorageData['error'] = `Unable to access localStorage, ${error}`;
      }

      // Get query parameters
      urlParams.forEach((value, key) => {
        queryParamsData[key] = value;
      });

      const info: DebugInformation = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        localStorage: localStorageData,
        queryParams: queryParamsData
      };

      setDebugInfo(info);
    }
  }, []);

  if (!isDebugMode || !debugInfo) return null;

  return (
    <div className="bg-gray-900 text-green-400 p-4 mb-4 rounded-lg font-mono text-xs">
      <h2 className="text-lg mb-2">Debug Information</h2>
      <pre className="overflow-auto max-h-48">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default DebugInfo;
