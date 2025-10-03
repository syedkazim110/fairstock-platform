'use client'

import { useState } from 'react'
import { regenerateSignedPdfs } from '@/app/actions/regenerate-signed-pdfs'

export default function RegeneratePdfsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleRegenerate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await regenerateSignedPdfs()
      setResult(response)
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Regenerate Signed PDFs
          </h1>
          <p className="text-gray-600 mb-6">
            This utility will regenerate signed PDFs for any fully-signed documents that are missing their signed PDF files.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-blue-900 mb-2">What this does:</h2>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Finds all documents with status 'fully_signed' but no signed_file_path</li>
              <li>Downloads the original PDF and signature data</li>
              <li>Generates a new signed PDF with signature page</li>
              <li>Uploads it to storage and updates the document record</li>
            </ul>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Regenerating...' : 'Regenerate Signed PDFs'}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {result.error ? (
                <>
                  <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                  <p className="text-red-800">{result.error}</p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-green-900 mb-2">Success!</h3>
                  <p className="text-green-800 mb-4">{result.message}</p>
                  
                  {result.results && result.results.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-green-900">Details:</h4>
                      <div className="max-h-64 overflow-y-auto">
                        {result.results.map((r: any, i: number) => (
                          <div 
                            key={i} 
                            className={`text-sm p-2 rounded ${
                              r.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : r.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            <span className="font-medium">{r.title}</span>
                            {' - '}
                            <span>{r.status}</span>
                            {r.reason && ` (${r.reason})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">After regeneration:</h3>
            <p className="text-sm text-gray-600">
              Go back to your documents page and refresh. The "View Signed PDF" button should now appear for all fully-signed documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
