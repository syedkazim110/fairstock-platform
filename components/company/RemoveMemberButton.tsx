'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface RemoveMemberButtonProps {
  companyId: string
  memberId: string
  memberName: string
}

export default function RemoveMemberButton({ companyId, memberId, memberName }: RemoveMemberButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRemove = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Delete the member
      const { error } = await supabase
        .from('company_members')
        .delete()
        .eq('id', memberId)
        .eq('company_id', companyId)

      if (error) {
        console.error('Error removing member:', error)
        alert('Failed to remove member. Please try again.')
        setLoading(false)
        return
      }

      // Refresh the page to show updated list
      router.refresh()
      setShowConfirm(false)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
      >
        Remove
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Remove Board Member
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Are you sure you want to remove <strong>{memberName}</strong> from this company? They will lose access to all company information and the cap table.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Removing...' : 'Remove Member'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
