import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600">
              There was a problem signing you in. This could be because:
            </p>
          </div>

          <ul className="space-y-2 mb-6 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>The magic link has expired (links are valid for 1 hour)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>The link has already been used</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>There was an issue with the authentication process</span>
            </li>
          </ul>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg text-center transition-colors"
            >
              Try again
            </Link>
            <p className="text-center text-sm text-gray-500">
              Request a new magic link to sign in
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
