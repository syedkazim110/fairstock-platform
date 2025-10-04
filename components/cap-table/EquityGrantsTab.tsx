'use client'

import { useState } from 'react'
import { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/client'
import FormattedNumberInput from '@/components/ui/FormattedNumberInput'

type Company = Database['public']['Tables']['companies']['Row']
type EquityGrant = Database['public']['Tables']['equity_grants']['Row']

interface EquityGrantsTabProps {
  company: Company
  isOwner: boolean
  equityGrants: EquityGrant[]
}

export default function EquityGrantsTab({
  company,
  isOwner,
  equityGrants
}: EquityGrantsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_email: '',
    grant_date: '',
    total_shares: '',
    vesting_start_date: '',
    vesting_duration_months: '48',
    cliff_months: '12',
    exercise_price: '',
    expiration_date: '',
    grant_type: 'ISO' as const,
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('equity_grants')
        .insert({
          company_id: company.id,
          recipient_name: formData.recipient_name,
          recipient_email: formData.recipient_email || null,
          grant_date: formData.grant_date,
          total_shares: parseFloat(formData.total_shares),
          vesting_start_date: formData.vesting_start_date || null,
          vesting_duration_months: parseInt(formData.vesting_duration_months),
          cliff_months: parseInt(formData.cliff_months),
          exercise_price: formData.exercise_price ? parseFloat(formData.exercise_price) : null,
          expiration_date: formData.expiration_date || null,
          grant_type: formData.grant_type,
          notes: formData.notes || null,
          created_by: user.id
        })

      if (error) throw error

      setFormData({
        recipient_name: '',
        recipient_email: '',
        grant_date: '',
        total_shares: '',
        vesting_start_date: '',
        vesting_duration_months: '48',
        cliff_months: '12',
        exercise_price: '',
        expiration_date: '',
        grant_type: 'ISO',
        notes: ''
      })
      setShowAddModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error adding equity grant:', error)
      alert('Failed to add equity grant. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateVested = (grant: EquityGrant) => {
    if (!grant.vesting_start_date) return grant.vested_shares || 0
    
    const startDate = new Date(grant.vesting_start_date)
    const cliffDate = new Date(startDate)
    cliffDate.setMonth(cliffDate.getMonth() + grant.cliff_months)
    const now = new Date()
    
    // If before cliff, nothing vests
    if (now < cliffDate) return 0
    
    // Calculate months elapsed more accurately
    const yearsDiff = now.getFullYear() - startDate.getFullYear()
    const monthsDiff = now.getMonth() - startDate.getMonth()
    const monthsElapsed = yearsDiff * 12 + monthsDiff
    
    // Calculate vesting progress (cap at 100%)
    const vestingProgress = Math.min(monthsElapsed / grant.vesting_duration_months, 1)
    
    // Return floored value
    return Math.floor(grant.total_shares * vestingProgress)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num))
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Equity Grants</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track option grants and vesting schedules
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Grant
            </button>
          )}
        </div>
      </div>

      {/* Grants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Shares
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vested
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exercised
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grant Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equityGrants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      <p className="text-sm">No equity grants yet</p>
                      {isOwner && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add First Grant
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                equityGrants.map((grant) => (
                  <tr key={grant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{grant.recipient_name}</div>
                      {grant.recipient_email && (
                        <div className="text-sm text-gray-500">{grant.recipient_email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {grant.grant_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(grant.total_shares)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(calculateVested(grant))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(grant.exercised_shares)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        grant.status === 'active' ? 'bg-green-100 text-green-800' :
                        grant.status === 'terminated' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {grant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(grant.grant_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Grant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Equity Grant</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grant Type *</label>
                  <select
                    required
                    value={formData.grant_type}
                    onChange={(e) => setFormData({ ...formData, grant_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ISO">ISO (Incentive Stock Option)</option>
                    <option value="NSO">NSO (Non-Qualified Stock Option)</option>
                    <option value="RSU">RSU (Restricted Stock Unit)</option>
                    <option value="RSA">RSA (Restricted Stock Award)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Shares *</label>
                  <FormattedNumberInput
                    value={formData.total_shares}
                    onChange={(value) => setFormData({ ...formData, total_shares: value })}
                    decimals={4}
                    placeholder="100,000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grant Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.grant_date}
                    onChange={(e) => setFormData({ ...formData, grant_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vesting Start Date</label>
                  <input
                    type="date"
                    value={formData.vesting_start_date}
                    onChange={(e) => setFormData({ ...formData, vesting_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vesting Duration (months)</label>
                  <input
                    type="number"
                    value={formData.vesting_duration_months}
                    onChange={(e) => setFormData({ ...formData, vesting_duration_months: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliff Period (months)</label>
                  <input
                    type="number"
                    value={formData.cliff_months}
                    onChange={(e) => setFormData({ ...formData, cliff_months: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exercise Price</label>
                  <FormattedNumberInput
                    value={formData.exercise_price}
                    onChange={(value) => setFormData({ ...formData, exercise_price: value })}
                    decimals={4}
                    placeholder="0.10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
