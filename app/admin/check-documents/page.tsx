'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CheckDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDocuments() {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, status, signed_file_path, file_path')
        .eq('status', 'fully_signed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error:', error)
      } else {
        setDocuments(data || [])
      }
      setLoading(false)
    }

    fetchDocuments()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-8">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Document Status Check
          </h1>

          {documents.length === 0 ? (
            <p className="text-gray-600">No fully-signed documents found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Has Signed PDF?
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Signed PDF Path
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.signed_file_path ? (
                          <span className="text-green-600 font-semibold">✓ YES</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ NO</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                        {doc.signed_file_path || <span className="text-gray-400">null</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">What to look for:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Has Signed PDF = YES:</strong> Document has a signed PDF and button should appear</li>
              <li>• <strong>Has Signed PDF = NO:</strong> Need to run the regeneration tool</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
