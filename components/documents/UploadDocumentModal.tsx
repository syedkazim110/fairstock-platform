'use client'

import { useState, useRef } from 'react'
import { uploadDocument } from '@/app/actions/documents'

interface BoardMember {
  id: string
  full_name: string | null
  email: string
}

interface UploadDocumentModalProps {
  companyId: string
  boardMembers: BoardMember[]
  onClose: () => void
  onSuccess: () => void
}

export default function UploadDocumentModal({
  companyId,
  boardMembers,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [requiresSignature, setRequiresSignature] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers)
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId)
    } else {
      newSelection.add(memberId)
    }
    setSelectedMembers(newSelection)
  }

  const selectAllMembers = () => {
    if (selectedMembers.size === boardMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(boardMembers.map((m) => m.id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please enter a document title')
      return
    }

    if (!file) {
      setError('Please select a file to upload')
      return
    }

    if (requiresSignature && selectedMembers.size === 0) {
      setError('Please select at least one board member to sign')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('companyId', companyId)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('file', file)
      formData.append('requiresSignature', String(requiresSignature))
      formData.append('boardMemberIds', JSON.stringify(Array.from(selectedMembers)))

      const result = await uploadDocument(formData)

      if (result.error) {
        setError(result.error)
        setIsUploading(false)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError('Failed to upload document')
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Upload Document for Signature</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Board Resolution - Q4 2024"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the document..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document File *
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Choose File
                </button>
                {file && (
                  <span className="text-sm text-gray-600">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresSignature}
                  onChange={(e) => {
                    setRequiresSignature(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedMembers(new Set())
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  This document requires signatures
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Check this if board members need to sign this document
              </p>
            </div>

            {requiresSignature && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Board Members to Sign *
                  </label>
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedMembers.size === boardMembers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {boardMembers.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
                  No board members found. Please add board members first.
                </p>
              ) : (
                <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                  {boardMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.full_name || 'Unnamed Member'}
                        </div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {selectedMembers.size} of {boardMembers.length}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || (requiresSignature && boardMembers.length === 0)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
