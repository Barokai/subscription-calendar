"use client";
import { useState, useEffect } from "react";

interface SettingsProps {
  className?: string;
}

const Settings: React.FC<SettingsProps> = ({ className = "" }) => {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDebugSetting =
        localStorage.getItem("showDebugInfo") === "true";
      setShowDebugInfo(savedDebugSetting);
    }
  }, []);

  // Save debug info preference to localStorage
  const toggleDebugInfo = () => {
    const newValue = !showDebugInfo;
    setShowDebugInfo(newValue);
    localStorage.setItem("showDebugInfo", newValue.toString());

    // Reload the page to apply the debug setting
    window.location.reload();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 flex items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Settings
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded shadow-lg p-4 z-50">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Settings
          </h3>

          <div className="mb-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDebugInfo}
                onChange={toggleDebugInfo}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Show Debug Info
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Shows debug information panel. You can also toggle with Ctrl+I.
            </p>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 mt-2"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
