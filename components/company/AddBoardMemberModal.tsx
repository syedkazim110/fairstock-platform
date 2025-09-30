'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AddBoardMemberModalProps {
  companyId: string
  onSuccess?: () => void
}

export default function AddBoardMemberModal({ companyId, onSuccess }: AddBoardMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in')
        setLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      // Check if user with this email exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (!existingProfile) {
        setError('No user found with this email address. They need to sign up first.')
        setLoading(false)
        return
      }

      // Check if this user is already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_id', existingProfile.id)
        .single()

      if (existingMember) {
        setError('This user is already a member of this company')
        setLoading(false)
        return
      }

      // Check if user is trying to add themselves
      if (existingProfile.id === user.id) {
        setError('You cannot add yourself as a board member')
        setLoading(false)
        return
      }

      // Add the board member
      const { error: insertError } = await supabase
        .from('company_members')
        .insert({
          company_id: companyId,
          user_id: existingProfile.id,
          role: 'board_member',
          invited_by: user.id,
          status: 'active'
        })

      if (insertError) {
        console.error('Error adding board member:', insertError)
        setError('Failed to add board member. Please try again.')
        setLoading(false)
        return
      }

      setSuccess('Board member added successfully!')
      setEmail('')
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Close modal after 1.5 seconds
      setTimeout(() => {
        setIsOpen(false)
        setSuccess('')
      }, 1500)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
      >
        Add Board Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Add Board Member
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setError('')
                  setSuccess('')
                  setEmail('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user must already have an account on the platform
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setError('')
                    setSuccess('')
                    setEmail('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
