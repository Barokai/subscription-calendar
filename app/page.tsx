import DebugInfo from "@/components/debug-info";
import ClientCalendarWrapper from "@/components/client-calendar-wrapper";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      {/* Client-side calendar wrapper */}
      <ClientCalendarWrapper />

      {/* Debug info will show in dev mode or with Ctrl+I */}
      <DebugInfo />
    </main>
  );
}
