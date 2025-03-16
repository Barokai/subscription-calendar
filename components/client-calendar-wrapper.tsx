"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the component to avoid SSR issues with localStorage
const SubscriptionCalendar = dynamic(
  () => import("@/components/subscription-calendar"),
  { ssr: false }
);

export default function ClientCalendarWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? (
    <SubscriptionCalendar />
  ) : (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
