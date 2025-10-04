'use client'

import { useState } from 'react'
import { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/client'
import FormattedNumberInput from '@/components/ui/FormattedNumberInput'

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
    security_type: 'common_stock' as const,
    close_date: '',
    valuation_pre_money: '',
    valuation_post_money: '',
    amount_raised: '',
    minimum_amount: '',
    maximum_amount: '',
    shares_issued: '',
    price_per_share: '',
    lead_investor: '',
    notes: '',
    create_option_pool: false,
    option_pool_shares: '',
    target_ownership_percentage: ''
  })
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      // Validate min/max amounts
      const minAmount = formData.minimum_amount ? parseFloat(formData.minimum_amount) : null
      const maxAmount = formData.maximum_amount ? parseFloat(formData.maximum_amount) : null
      const targetAmount = parseFloat(formData.amount_raised)

      if (minAmount && minAmount > targetAmount) {
        throw new Error('Minimum amount cannot be greater than target amount')
      }
      if (maxAmount && maxAmount < targetAmount) {
        throw new Error('Maximum amount cannot be less than target amount')
      }
      if (minAmount && maxAmount && minAmount > maxAmount) {
        throw new Error('Minimum amount cannot be greater than maximum amount')
      }

      // Calculate price per share based on company's share calculation method
      // We'll need to fetch cap table data to calculate this
      const { data: capTableEntries } = await supabase
        .from('cap_table_entries')
        .select('shares, equity_type')
        .eq('company_id', company.id)

      const { data: equityGrants } = await supabase
        .from('equity_grants')
        .select('total_shares')
        .eq('company_id', company.id)

      const { data: optionPools } = await supabase
        .from('option_pools')
        .select('total_shares')
        .eq('company_id', company.id)

      // Calculate share count based on method
      let shareCount = 0
      const issuedShares = capTableEntries
        ?.filter(entry => entry.equity_type !== 'option')
        .reduce((sum, entry) => sum + Number(entry.shares), 0) || 0

      if (company.share_calculation_method === 'issued_outstanding') {
        shareCount = issuedShares
      } else {
        // Fully diluted: issued + all options
        const totalOptions = equityGrants?.reduce((sum, grant) => sum + Number(grant.total_shares), 0) || 0
        const optionPoolShares = optionPools?.reduce((sum, pool) => sum + Number(pool.total_shares), 0) || 0
        shareCount = issuedShares + totalOptions + optionPoolShares
        
        // Add option pool increase if specified
        if (formData.create_option_pool && formData.option_pool_shares) {
          shareCount += parseFloat(formData.option_pool_shares)
        }
      }

      const preMoney = formData.valuation_pre_money ? parseFloat(formData.valuation_pre_money) : 0
      const calculatedPricePerShare = shareCount > 0 ? preMoney / shareCount : null

      const { error } = await supabase
        .from('fundraising_rounds')
        .insert({
          company_id: company.id,
          round_name: formData.round_name,
          round_type: formData.round_type,
          security_type: formData.security_type,
          close_date: formData.close_date,
          valuation_pre_money: preMoney || null,
          valuation_post_money: formData.valuation_post_money ? parseFloat(formData.valuation_post_money) : null,
          amount_raised: targetAmount,
          minimum_amount: minAmount,
          maximum_amount: maxAmount,
          option_pool_increase: formData.create_option_pool && formData.option_pool_shares ? parseFloat(formData.option_pool_shares) : 0,
          target_ownership_percentage: formData.target_ownership_percentage ? parseFloat(formData.target_ownership_percentage) : null,
          calculated_price_per_share: calculatedPricePerShare,
          shares_issued: formData.shares_issued ? parseFloat(formData.shares_issued) : null,
          price_per_share: formData.price_per_share ? parseFloat(formData.price_per_share) : null,
          lead_investor: formData.lead_investor || null,
          notes: formData.notes || null,
          created_by: user.id
        })

      if (error) throw error

      // If option pool creation was requested, create the option pool
      if (formData.create_option_pool && formData.option_pool_shares) {
        const poolShares = parseFloat(formData.option_pool_shares)
        await supabase
          .from('option_pools')
          .insert({
            company_id: company.id,
            pool_name: `${formData.round_name} Option Pool`,
            total_shares: poolShares,
            granted_shares: 0,
            available_shares: poolShares,
            created_date: formData.close_date,
            notes: `Created as part of ${formData.round_name}`,
            created_by: user.id
          })
      }

      setFormData({
        round_name: '',
        round_type: 'seed',
        security_type: 'common_stock',
        close_date: '',
        valuation_pre_money: '',
        valuation_post_money: '',
        amount_raised: '',
        minimum_amount: '',
        maximum_amount: '',
        shares_issued: '',
        price_per_share: '',
        lead_investor: '',
        notes: '',
        create_option_pool: false,
        option_pool_shares: '',
        target_ownership_percentage: ''
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
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Type *</label>
                    <select
                      required
                      value={formData.security_type}
                      onChange={(e) => setFormData({ ...formData, security_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="common_stock">Common Stock</option>
                      <option value="preferred_stock">Preferred Stock</option>
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
                </div>
              </div>

              {/* Offering Terms */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-gray-900">Offering Terms</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Amount to Raise *
                    </label>
                    <FormattedNumberInput
                      value={formData.amount_raised}
                      onChange={(value) => setFormData({ ...formData, amount_raised: value })}
                      decimals={2}
                      placeholder="1,000,000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pre-Money Valuation *
                    </label>
                    <FormattedNumberInput
                      value={formData.valuation_pre_money}
                      onChange={(value) => setFormData({ ...formData, valuation_pre_money: value })}
                      decimals={2}
                      placeholder="5,000,000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Amount (Optional)
                      <span className="ml-1 text-xs text-gray-500">Below which offering is abandoned</span>
                    </label>
                    <FormattedNumberInput
                      value={formData.minimum_amount}
                      onChange={(value) => setFormData({ ...formData, minimum_amount: value })}
                      decimals={2}
                      placeholder="500,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Amount (Optional)
                      <span className="ml-1 text-xs text-gray-500">Beyond which no more funds accepted</span>
                    </label>
                    <FormattedNumberInput
                      value={formData.maximum_amount}
                      onChange={(value) => setFormData({ ...formData, maximum_amount: value })}
                      decimals={2}
                      placeholder="1,500,000"
                    />
                  </div>
                </div>
              </div>

              {/* Option Pool */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-gray-900">Option Pool</h4>
                <div className="space-y-3">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.create_option_pool}
                      onChange={(e) => setFormData({ ...formData, create_option_pool: e.target.checked })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">Create option pool for employees/consultants</div>
                      <p className="text-sm text-gray-500">
                        Reserve shares for future employee grants as part of this financing
                      </p>
                    </div>
                  </label>

                  {formData.create_option_pool && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Shares to Reserve *
                      </label>
                      <FormattedNumberInput
                        value={formData.option_pool_shares}
                        onChange={(value) => setFormData({ ...formData, option_pool_shares: value })}
                        decimals={0}
                        placeholder="1,000,000"
                        required={formData.create_option_pool}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Calculated Metrics */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-gray-900">Additional Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Post-Money Valuation (Optional)</label>
                    <FormattedNumberInput
                      value={formData.valuation_post_money}
                      onChange={(value) => setFormData({ ...formData, valuation_post_money: value })}
                      decimals={2}
                      placeholder="6,000,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Ownership % (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="20"
                      value={formData.target_ownership_percentage}
                      onChange={(e) => setFormData({ ...formData, target_ownership_percentage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead Investor (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Acme Ventures"
                      value={formData.lead_investor}
                      onChange={(e) => setFormData({ ...formData, lead_investor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shares Issued (Optional)</label>
                    <FormattedNumberInput
                      value={formData.shares_issued}
                      onChange={(value) => setFormData({ ...formData, shares_issued: value })}
                      decimals={4}
                      placeholder="2,000,000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Calculation Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Price Calculation</h4>
                <p className="text-sm text-blue-800">
                  The price per share will be automatically calculated based on your company's share calculation method 
                  (currently: <strong>{company.share_calculation_method.replace('_', ' ')}</strong>) and the pre-money valuation you entered.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  You can change the calculation method in Company Settings if needed.
                </p>
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
