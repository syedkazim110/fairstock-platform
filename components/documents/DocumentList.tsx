'use client'

import { useState } from 'react'
import { deleteDocument } from '@/app/actions/documents'

interface Signature {
  id: string
  status: 'pending' | 'signed' | 'declined'
  board_member_id: string
  signed_at: string | null
  profiles: {
    full_name: string | null
    email: string
  } | null
}

interface Document {
  id: string
  title: string
  description: string | null
  file_name: string
  file_size: number
  status: 'pending' | 'partially_signed' | 'fully_signed' | 'cancelled'
  created_at: string
  document_signatures: Signature[]
}

interface DocumentListProps {
  documents: Document[]
  isOwner: boolean
  onRefresh: () => void
}

export default function DocumentList({ documents, isOwner, onRefresh }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getStatusBadge = (status: Document['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      partially_signed: 'bg-blue-100 text-blue-800',
      fully_signed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }

    const labels = {
      pending: 'Pending',
      partially_signed: 'Partially Signed',
      fully_signed: 'Fully Signed',
      cancelled: 'Cancelled',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeletingId(documentId)

    const result = await deleteDocument(documentId)

    if (result.error) {
      alert(result.error)
    } else {
      onRefresh()
    }

    setDeletingId(null)
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

  if (documents.length === 0) {
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
        <p className="mt-1 text-sm text-gray-500">
          {isOwner
            ? 'Get started by uploading a document for signature.'
            : 'No documents have been shared with you yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const signedCount = doc.document_signatures.filter((s) => s.status === 'signed').length
        const totalSignatures = doc.document_signatures.length
        const declinedCount = doc.document_signatures.filter((s) => s.status === 'declined')
          .length

        return (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                  {getStatusBadge(doc.status)}
                </div>

                {doc.description && (
                  <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
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
                    {doc.file_name}
                  </div>
                  <div>{formatFileSize(doc.file_size)}</div>
                  <div>{formatDate(doc.created_at)}</div>
                </div>

                {doc.document_signatures.length > 0 ? (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Signatures</span>
                      <span className="text-sm text-gray-600">
                        {signedCount} of {totalSignatures} signed
                      </span>
                    </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${totalSignatures > 0 ? (signedCount / totalSignatures) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    {doc.document_signatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              sig.status === 'signed'
                                ? 'bg-green-500'
                                : sig.status === 'declined'
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500'
                            }`}
                          />
                          <span className="text-gray-900">
                            {sig.profiles?.full_name || sig.profiles?.email || 'Unknown User'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {sig.status === 'signed' && sig.signed_at && (
                            <span className="text-gray-500 text-xs">
                              Signed {formatDate(sig.signed_at)}
                            </span>
                          )}
                          <span
                            className={`text-xs ${
                              sig.status === 'signed'
                                ? 'text-green-600'
                                : sig.status === 'declined'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {sig.status === 'signed'
                              ? '✓ Signed'
                              : sig.status === 'declined'
                                ? '✗ Declined'
                                : '○ Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                    {declinedCount > 0 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        ⚠ {declinedCount} board member(s) declined to sign this document
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>This document does not require signatures</span>
                    </div>
                  </div>
                )}
              </div>

              {isOwner && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="ml-4 text-red-600 hover:text-red-800 disabled:opacity-50"
                  title="Delete document"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
