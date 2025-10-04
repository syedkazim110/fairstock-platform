'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database.types'
import FormattedNumberInput from '@/components/ui/FormattedNumberInput'

type Company = Database['public']['Tables']['companies']['Row']

interface CompanySettingsProps {
  company: Company
}

export default function CompanySettings({ company }: CompanySettingsProps) {
  const [name, setName] = useState(company.name)
  const [description, setDescription] = useState(company.description || '')
  const [authorizedShares, setAuthorizedShares] = useState(company.authorized_shares.toString())
  const [shareCalculationMethod, setShareCalculationMethod] = useState(company.share_calculation_method)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const authorizedSharesNum = parseFloat(authorizedShares)

      // Validate authorized shares
      if (authorizedSharesNum < 1) {
        throw new Error('Authorized shares must be at least 1')
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          name,
          description: description || null,
          authorized_shares: authorizedSharesNum,
          share_calculation_method: shareCalculationMethod,
        })
        .eq('id', company.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update company settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-600 mt-1">Manage your company's basic information and share structure</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Share Structure Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Structure</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="authorizedShares" className="block text-sm font-medium text-gray-700 mb-1">
                Authorized Shares *
              </label>
              <FormattedNumberInput
                value={authorizedShares}
                onChange={(value) => setAuthorizedShares(value)}
                decimals={0}
                placeholder="10,000,000"
                required
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Total number of shares authorized in your articles of incorporation. This sets the maximum number of shares your company can issue.
              </p>
            </div>

            <div>
              <label htmlFor="shareCalculationMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Share Price Calculation Method *
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: shareCalculationMethod === 'issued_outstanding' ? '#3B82F6' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    name="shareCalculationMethod"
                    value="issued_outstanding"
                    checked={shareCalculationMethod === 'issued_outstanding'}
                    onChange={(e) => setShareCalculationMethod(e.target.value as any)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Issued and Outstanding</div>
                    <p className="text-sm text-gray-500 mt-1">
                      Only counts shares actually issued today. Excludes unexercised options, unissued option pool shares, and unconverted SAFEs/notes.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      <strong>Use this if:</strong> You only have common or preferred stock issued (no options, SAFEs, or convertibles).
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: shareCalculationMethod === 'fully_diluted' ? '#3B82F6' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    name="shareCalculationMethod"
                    value="fully_diluted"
                    checked={shareCalculationMethod === 'fully_diluted'}
                    onChange={(e) => setShareCalculationMethod(e.target.value as any)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Fully Diluted</div>
                    <p className="text-sm text-gray-500 mt-1">
                      Counts everything that could become shares. Includes issued shares + all options (granted and reserved in pool) + convertibles (SAFEs/notes) as if already converted + any new option pool increase.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      <strong>Use this if:</strong> You have options, SAFEs, convertibles, or want to account for future dilution.
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Note:</strong> This setting affects how price per share is calculated during fundraising rounds. 
                  Fully diluted provides a more conservative (lower) share price as it accounts for future dilution.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <strong>Success!</strong> Company settings updated successfully.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
