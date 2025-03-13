"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import DebugInfo from '@/components/debug-info';

// Dynamically import the component to avoid SSR issues with localStorage
const SubscriptionCalendar = dynamic(
  () => import('@/components/subscription-calendar'),
  { ssr: false }
);

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      {/* Include debug info to help diagnose issues */}
      <DebugInfo />
      
      {/* Only render the component on the client side */}
      {isClient ? (
        <SubscriptionCalendar />
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </main>
  )
}
