"use client";
import React, { useEffect, useState } from 'react';

const DebugInfo: React.FC = () => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [info, setInfo] = useState<Record<string, any>>({});
  
  useEffect(() => {
    // Update window size
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    // Collect debug info
    const collectInfo = () => {
      setInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
      });
    };
    
    window.addEventListener('resize', updateWindowSize);
    updateWindowSize();
    collectInfo();
    
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <h4 className="font-bold mb-2">Debug Info:</h4>
      <div>
        <div>Window: {windowSize.width}x{windowSize.height}</div>
        {Object.entries(info).map(([key, value]) => (
          <div key={key}>
            {key}: {typeof value === 'boolean' ? value.toString() : String(value)}
          </div>
        ))}
        <div className="mt-2 text-green-400">React is working!</div>
      </div>
    </div>
  );
};

export default DebugInfo;
