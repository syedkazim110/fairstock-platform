'use client'

import { useState } from 'react'
import { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/client'

type Company = Database['public']['Tables']['companies']['Row']
type FundraisingRound = Database['public']['Tables']['fundraising_rounds']['Row']

interface FundraisingRoundsTabProps {
  company: Company
  isOwner: boolean
  fundraisingRounds: FundraisingRound[]
}

export default function FundraisingRoundsTab({
  company,
  isOwner,
  fundraisingRounds
}: FundraisingRoundsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    round_name: '',
    round_type: 'seed' as const,
    close_date: '',
    valuation_pre_money: '',
    valuation_post_money: '',
    amount_raised: '',
    shares_issued: '',
    price_per_share: '',
    lead_investor: '',
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
        .from('fundraising_rounds')
        .insert({
          company_id: company.id,
          round_name: formData.round_name,
          round_type: formData.round_type,
          close_date: formData.close_date,
          valuation_pre_money: formData.valuation_pre_money ? parseFloat(formData.valuation_pre_money) : null,
          valuation_post_money: formData.valuation_post_money ? parseFloat(formData.valuation_post_money) : null,
          amount_raised: parseFloat(formData.amount_raised),
          shares_issued: formData.shares_issued ? parseFloat(formData.shares_issued) : null,
          price_per_share: formData.price_per_share ? parseFloat(formData.price_per_share) : null,
          lead_investor: formData.lead_investor || null,
          notes: formData.notes || null,
          created_by: user.id
        })

      if (error) throw error

      setFormData({
        round_name: '',
        round_type: 'seed',
        close_date: '',
        valuation_pre_money: '',
        valuation_post_money: '',
        amount_raised: '',
        shares_issued: '',
        price_per_share: '',
        lead_investor: '',
        notes: ''
      })
      setShowAddModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error adding fundraising round:', error)
      alert('Failed to add fundraising round. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num))
  }

  const totalRaised = fundraisingRounds.reduce((sum, round) => sum + Number(round.amount_raised), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fundraising Rounds</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track funding history and valuations
            </p>
            <p className="text-sm font-medium text-gray-900 mt-2">
              Total Raised: {formatCurrency(totalRaised)}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Round
            </button>
          )}
        </div>
      </div>

      {/* Rounds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Round
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Raised
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pre-Money
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Post-Money
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Investor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Close Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fundraisingRounds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <p className="text-sm">No fundraising rounds yet</p>
                      {isOwner && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add First Round
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                fundraisingRounds.map((round) => (
                  <tr key={round.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{round.round_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 capitalize">
                        {round.round_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(round.amount_raised)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {round.valuation_pre_money ? formatCurrency(round.valuation_pre_money) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {round.valuation_post_money ? formatCurrency(round.valuation_post_money) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {round.lead_investor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(round.close_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Round Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Fundraising Round</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Round Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Seed Round 2024"
                    value={formData.round_name}
                    onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Round Type *</label>
                  <select
                    required
                    value={formData.round_type}
                    onChange={(e) => setFormData({ ...formData, round_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="seed">Seed</option>
                    <option value="series_a">Series A</option>
                    <option value="series_b">Series B</option>
                    <option value="series_c">Series C</option>
                    <option value="series_d">Series D</option>
                    <option value="bridge">Bridge</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Close Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.close_date}
                    onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Raised *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="1000000"
                    value={formData.amount_raised}
                    onChange={(e) => setFormData({ ...formData, amount_raised: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Money Valuation</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5000000"
                    value={formData.valuation_pre_money}
                    onChange={(e) => setFormData({ ...formData, valuation_pre_money: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Post-Money Valuation</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="6000000"
                    value={formData.valuation_post_money}
                    onChange={(e) => setFormData({ ...formData, valuation_post_money: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shares Issued</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.shares_issued}
                    onChange={(e) => setFormData({ ...formData, shares_issued: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Share</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.price_per_share}
                    onChange={(e) => setFormData({ ...formData, price_per_share: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Investor</label>
                  <input
                    type="text"
                    placeholder="e.g., Acme Ventures"
                    value={formData.lead_investor}
                    onChange={(e) => setFormData({ ...formData, lead_investor: e.target.value })}
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
                  {loading ? 'Adding...' : 'Add Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
