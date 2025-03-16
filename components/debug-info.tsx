"use client";
import React, { useState, useEffect, useCallback } from "react";

interface DebugInformation {
  url: string;
  userAgent: string;
  screenSize: string;
  localStorage: Record<string, string | null>;
  queryParams: Record<string, string>;
  environment: string;
}

const DebugInfo: React.FC = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInformation | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Store whether debug was manually hidden
  const [, setManuallyHidden] = useState(false);

  // Function to detect development mode more reliably
  const isDevelopmentMode = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    // Check for localhost or development URLs
    const hostname = window.location.hostname;
    const port = window.location.port;

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      port === "3000" ||
      port === "3001" ||
      hostname.includes(".local")
    );
  }, []);

  // Function to collect debug information - wrapped in useCallback
  const collectDebugInfo = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const localStorageData: Record<string, string | null> = {};
    const queryParamsData: Record<string, string> = {};
    const urlParams = new URLSearchParams(window.location.search);

    // Get localStorage items (safely)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
    } catch (error) {
      localStorageData["error"] = `Unable to access localStorage, ${error}`;
    }

    // Get query parameters
    urlParams.forEach((value, key) => {
      queryParamsData[key] = value;
    });

    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: localStorageData,
      queryParams: queryParamsData,
      environment: isDevelopmentMode() ? "development" : "production",
    };
  }, [isDevelopmentMode]);

  // Get the saved preference from localStorage
  const getSavedDebugPreference = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const saved = localStorage.getItem("debugInfoManuallyHidden");
      return saved === "true" ? true : saved === "false" ? false : null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return null;
    }
  }, []);

  // Save preference to localStorage
  const saveDebugPreference = useCallback((hidden: boolean) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem("debugInfoManuallyHidden", hidden.toString());
    } catch (e) {
      console.error("Failed to save debug preference:", e);
    }
  }, []);

  // Toggle debug mode - this runs when Ctrl+I is pressed
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode((prevMode) => {
      const newMode = !prevMode;

      // Update manually hidden state
      setManuallyHidden(!newMode);

      // Save preference to localStorage
      saveDebugPreference(!newMode);

      if (newMode) {
        setDebugInfo(collectDebugInfo() || null);
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
      return newMode;
    });
  }, [collectDebugInfo, saveDebugPreference]);

  // Function to explicitly hide debug info
  const hideDebugInfo = useCallback(() => {
    setIsDebugMode(false);
    setManuallyHidden(true);
    saveDebugPreference(true);
  }, [saveDebugPreference]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Update window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Check the saved preference first
    const wasManuallyHidden = getSavedDebugPreference();
    setManuallyHidden(wasManuallyHidden === true);

    // Check URL param
    const urlParams = new URLSearchParams(window.location.search);
    const debugFromUrl = urlParams.get("debug") === "true";

    // Auto-show in development mode or if set in URL, unless manually hidden
    const isDevMode = isDevelopmentMode();

    // Only auto-show if not manually hidden
    if ((debugFromUrl || isDevMode) && wasManuallyHidden !== true) {
      setIsDebugMode(true);
      setDebugInfo(collectDebugInfo() || null);
    }

    // Add keyboard shortcut listener (Ctrl+I)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "i") {
        event.preventDefault(); // Prevent default browser behavior
        toggleDebugMode();
      }
    };

    // Add resize listener to update window size
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      if (isDebugMode) {
        setDebugInfo(collectDebugInfo() || null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    collectDebugInfo,
    getSavedDebugPreference,
    isDevelopmentMode,
    isDebugMode,
    toggleDebugMode,
  ]);

  // Update debug info when visibility changes
  useEffect(() => {
    if (isDebugMode) {
      setDebugInfo(collectDebugInfo() || null);
    }
  }, [collectDebugInfo, isDebugMode]);

  if (!isDebugMode) {
    return null;
  }

  // Helper function to display complex objects
  const formatValue = (value: unknown): string => {
    if (value === null) {
      return "null";
    }
    if (value === undefined) {
      return "undefined";
    }
    if (typeof value === "object") {
      return "[Object]"; // Just indicate it's an object to avoid clutter
    }
    return String(value);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold">Debug Info:</h4>
        <button
          onClick={hideDebugInfo}
          className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="Hide/show with Ctrl+I"
        >
          Hide
        </button>
      </div>

      <div>
        <div>
          Window: {windowSize.width}x{windowSize.height}
        </div>

        {debugInfo && (
          <>
            <div>URL: {debugInfo.url.split("?")[0]}</div>
            <div>Environment: {debugInfo.environment}</div>

            {Object.keys(debugInfo.queryParams).length > 0 && (
              <div className="mt-1">
                <div className="font-semibold">Query Params:</div>
                {Object.entries(debugInfo.queryParams).map(([key, value]) => (
                  <div key={`query-${key}`} className="pl-2">
                    {key}: {value}
                  </div>
                ))}
              </div>
            )}

            {Object.keys(debugInfo.localStorage).length > 0 && (
              <div className="mt-1">
                <div className="font-semibold">LocalStorage:</div>
                {Object.entries(debugInfo.localStorage)
                  .slice(0, 5)
                  .map(([key, value]) => (
                    <div key={`ls-${key}`} className="pl-2">
                      {key}: {formatValue(value)}
                    </div>
                  ))}
                {Object.keys(debugInfo.localStorage).length > 5 && (
                  <div className="pl-2 text-gray-400">
                    + {Object.keys(debugInfo.localStorage).length - 5} more
                    items
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-2 text-green-400">React is working!</div>
      </div>
    </div>
  );
};

export default DebugInfo;
