'use client'

import { useState } from 'react'
import SignatureModal from './SignatureModal'
import { declineDocument } from '@/app/actions/documents'

interface PendingSignature {
  id: string
  status: 'pending' | 'signed' | 'declined'
  created_at: string
  documents: {
    id: string
    title: string
    description: string | null
    file_name: string
    file_size: number
    created_at: string
    companies: {
      name: string
    }
  }
}

interface PendingDocumentsProps {
  signatures: PendingSignature[]
  onRefresh: () => void
}

export default function PendingDocuments({ signatures, onRefresh }: PendingDocumentsProps) {
  const [selectedSignature, setSelectedSignature] = useState<PendingSignature | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)

  const handleDecline = async (signatureId: string) => {
    const reason = prompt('Please provide a reason for declining (optional):')
    if (reason === null) return // User cancelled

    setDecliningId(signatureId)

    const result = await declineDocument(signatureId, reason || 'No reason provided')

    if (result.error) {
      alert(result.error)
    } else {
      onRefresh()
    }

    setDecliningId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (signatures.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No pending signatures</h3>
        <p className="mt-1 text-sm text-gray-500">
          You have no documents waiting for your signature.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {signatures.map((signature) => (
          <div
            key={signature.id}
            className="bg-white border-2 border-yellow-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {signature.documents.title}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Awaiting Your Signature
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Company:</span> {signature.documents.companies.name}
                </div>

                {signature.documents.description && (
                  <p className="text-sm text-gray-600 mb-3">{signature.documents.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {signature.documents.file_name}
                  </div>
                  <div>{formatFileSize(signature.documents.file_size)}</div>
                  <div>Uploaded {formatDate(signature.documents.created_at)}</div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedSignature(signature)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Sign Document
                  </button>
                  <button
                    onClick={() => handleDecline(signature.id)}
                    disabled={decliningId === signature.id}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {decliningId === signature.id ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedSignature && (
        <SignatureModal
          signatureId={selectedSignature.id}
          documentTitle={selectedSignature.documents.title}
          onClose={() => setSelectedSignature(null)}
          onSuccess={() => {
            setSelectedSignature(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
