'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DocumentList from '@/components/documents/DocumentList'
import UploadDocumentModal from '@/components/documents/UploadDocumentModal'

interface BoardMember {
  id: string
  full_name: string | null
  email: string
}

interface DocumentsViewProps {
  companyId: string
  companyName: string
  isOwner: boolean
  documents: any[]
  boardMembers: BoardMember[]
}

export default function DocumentsView({
  companyId,
  companyName,
  isOwner,
  documents,
  boardMembers,
}: DocumentsViewProps) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/company/${companyId}`}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to {companyName}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Documents & Signatures</h1>
              <p className="mt-2 text-sm text-gray-600">
                {isOwner
                  ? 'Upload documents and request signatures from board members'
                  : 'View and sign documents shared with you'}
              </p>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Upload Document
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Documents</div>
            <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Fully Signed</div>
            <div className="text-2xl font-bold text-green-600">
              {documents.filter((d) => d.status === 'fully_signed').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Pending Signatures</div>
            <div className="text-2xl font-bold text-yellow-600">
              {documents.filter((d) => d.status === 'pending' || d.status === 'partially_signed').length}
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Documents</h2>
          <DocumentList documents={documents} isOwner={isOwner} onRefresh={handleRefresh} />
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          companyId={companyId}
          boardMembers={boardMembers}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}
