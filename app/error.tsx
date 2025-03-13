'use client'
 
import { useEffect } from 'react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])
 
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-red-500 mb-6 p-4 bg-red-100 rounded-lg">
        {error.message || 'An unknown error occurred'}
      </p>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => reset()}
      >
        Try again
      </button>
      <div className="mt-8 text-sm text-gray-500">
        <p>If the problem persists, try:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Refreshing the page</li>
          <li>Clearing your browser cache</li>
          <li>Checking for browser console errors</li>
        </ul>
      </div>
    </div>
  )
}
