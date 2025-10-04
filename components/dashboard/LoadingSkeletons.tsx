export function CompanyListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded ml-2"></div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <div className="h-5 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function HoldingsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="block bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="flex flex-wrap gap-2">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-5 bg-gray-200 rounded w-14"></div>
              </div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded ml-4"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <div className="h-3 bg-gray-200 rounded w-12 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div>
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PendingDocumentsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyStateSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-4"></div>
      <div className="h-5 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
    </div>
  )
}
