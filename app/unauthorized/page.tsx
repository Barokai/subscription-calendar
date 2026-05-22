export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-xl w-full max-w-sm text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400 text-sm">
          Your Google account is not on the access list for this app.
        </p>
        <a
          href="/login"
          className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Try a different account
        </a>
      </div>
    </main>
  );
}
