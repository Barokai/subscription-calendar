"use client";
import React, { useState, useEffect } from 'react';

const DebugInfo: React.FC = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    // Check if we should show debug info
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get('debug') === 'true';
    setIsDebugMode(debug);

    if (debug) {
      // Collect debug information
      const info = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        localStorage: {},
        queryParams: {}
      };

      // Get localStorage items (safely)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            info.localStorage[key] = value;
          }
        }
      } catch (error) {
        info.localStorage = { error: 'Unable to access localStorage' };
      }

      // Get query parameters
      urlParams.forEach((value, key) => {
        info.queryParams[key] = value;
      });

      setDebugInfo(info);
    }
  }, []);

  if (!isDebugMode) return null;

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
