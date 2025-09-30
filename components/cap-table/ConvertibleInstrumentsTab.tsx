'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { convertInstrument } from '@/app/actions/company'

type Company = Database['public']['Tables']['companies']['Row']
type ConvertibleInstrument = Database['public']['Tables']['convertible_instruments']['Row']
type FundraisingRound = Database['public']['Tables']['fundraising_rounds']['Row']

interface ConvertibleInstrumentsTabProps {
  company: Company
  isOwner: boolean
  convertibleInstruments: ConvertibleInstrument[]
}

export default function ConvertibleInstrumentsTab({
  company,
  isOwner,
  convertibleInstruments
}: ConvertibleInstrumentsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedInstrument, setSelectedInstrument] = useState<ConvertibleInstrument | null>(null)
  const [fundraisingRounds, setFundraisingRounds] = useState<FundraisingRound[]>([])
  const [loading, setLoading] = useState(false)
  const [convertLoading, setConvertLoading] = useState(false)
  const [formData, setFormData] = useState({
    investor_name: '',
    investor_email: '',
    instrument_type: 'SAFE' as const,
    principal_amount: '',
    discount_rate: '',
    valuation_cap: '',
    interest_rate: '',
    issue_date: '',
    maturity_date: '',
    notes: ''
  })
  const [convertFormData, setConvertFormData] = useState({
    round_id: '',
    equity_type: 'preferred_stock' as 'common_stock' | 'preferred_stock',
    conversion_price: '',
    shares: ''
  })

  // Auto-calculate shares when conversion price changes
  useEffect(() => {
    if (selectedInstrument && convertFormData.conversion_price) {
      const price = parseFloat(convertFormData.conversion_price)
      if (price > 0) {
        const calculatedShares = (selectedInstrument.principal_amount / price).toFixed(4)
        setConvertFormData(prev => ({ ...prev, shares: calculatedShares }))
      }
    }
  }, [selectedInstrument, convertFormData.conversion_price])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('convertible_instruments')
        .insert({
          company_id: company.id,
          investor_name: formData.investor_name,
          investor_email: formData.investor_email || null,
          instrument_type: formData.instrument_type,
          principal_amount: parseFloat(formData.principal_amount),
          discount_rate: formData.discount_rate ? parseFloat(formData.discount_rate) : null,
          valuation_cap: formData.valuation_cap ? parseFloat(formData.valuation_cap) : null,
          interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
          issue_date: formData.issue_date,
          maturity_date: formData.maturity_date || null,
          notes: formData.notes || null,
          created_by: user.id
        })

      if (error) throw error

      setFormData({
        investor_name: '',
        investor_email: '',
        instrument_type: 'SAFE',
        principal_amount: '',
        discount_rate: '',
        valuation_cap: '',
        interest_rate: '',
        issue_date: '',
        maturity_date: '',
        notes: ''
      })
      setShowAddModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error adding convertible instrument:', error)
      alert('Failed to add convertible instrument. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  }

  const totalOutstanding = convertibleInstruments
    .filter(inst => inst.status === 'outstanding')
    .reduce((sum, inst) => sum + Number(inst.principal_amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Convertible Instruments</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track SAFEs and convertible notes
            </p>
            <p className="text-sm font-medium text-gray-900 mt-2">
              Total Outstanding: {formatCurrency(totalOutstanding)}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Instrument
            </button>
          )}
        </div>
      </div>

      {/* Instruments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Principal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valuation Cap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue Date
                </th>
                {isOwner && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {convertibleInstruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">No convertible instruments yet</p>
                      {isOwner && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add First Instrument
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                convertibleInstruments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{inst.investor_name}</div>
                      {inst.investor_email && (
                        <div className="text-sm text-gray-500">{inst.investor_email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        {inst.instrument_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(inst.principal_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {inst.discount_rate ? `${inst.discount_rate}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {inst.valuation_cap ? formatCurrency(inst.valuation_cap) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                        inst.status === 'outstanding' ? 'bg-blue-100 text-blue-800' :
                        inst.status === 'converted' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inst.issue_date).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {inst.status === 'outstanding' ? (
                          <button
                            onClick={async () => {
                              setSelectedInstrument(inst)
                              // Fetch fundraising rounds
                              const supabase = createClient()
                              const { data } = await supabase
                                .from('fundraising_rounds')
                                .select('*')
                                .eq('company_id', company.id)
                                .order('close_date', { ascending: false })
                              setFundraisingRounds(data || [])
                              setShowConvertModal(true)
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            Convert
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Instrument Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Convertible Instrument</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.investor_name}
                    onChange={(e) => setFormData({ ...formData, investor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.investor_email}
                    onChange={(e) => setFormData({ ...formData, investor_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instrument Type *</label>
                  <select
                    required
                    value={formData.instrument_type}
                    onChange={(e) => setFormData({ ...formData, instrument_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="SAFE">SAFE</option>
                    <option value="convertible_note">Convertible Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.principal_amount}
                    onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_rate}
                    onChange={(e) => setFormData({ ...formData, discount_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valuation Cap</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valuation_cap}
                    onChange={(e) => setFormData({ ...formData, valuation_cap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maturity Date</label>
                  <input
                    type="date"
                    value={formData.maturity_date}
                    onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value })}
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
                  {loading ? 'Adding...' : 'Add Instrument'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Instrument Modal */}
      {showConvertModal && selectedInstrument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Convert Instrument</h3>
              <p className="text-sm text-gray-600 mt-1">
                Convert {selectedInstrument.instrument_type} from {selectedInstrument.investor_name}
              </p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              setConvertLoading(true)

              try {
                const result = await convertInstrument(
                  selectedInstrument.id,
                  convertFormData.round_id,
                  {
                    shares: parseFloat(convertFormData.shares),
                    pricePerShare: parseFloat(convertFormData.conversion_price),
                    equityType: convertFormData.equity_type
                  }
                )

                if (result.success) {
                  alert(result.message)
                  setShowConvertModal(false)
                  setSelectedInstrument(null)
                  setConvertFormData({
                    round_id: '',
                    equity_type: 'preferred_stock',
                    conversion_price: '',
                    shares: ''
                  })
                  window.location.reload()
                } else {
                  alert(result.error)
                }
              } catch (error) {
                console.error('Error converting instrument:', error)
                alert('Failed to convert instrument. Please try again.')
              } finally {
                setConvertLoading(false)
              }
            }} className="p-6 space-y-4">
              {/* Instrument Details */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-gray-900">Instrument Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-600">Principal:</span> {formatCurrency(selectedInstrument.principal_amount)}</div>
                  <div><span className="text-gray-600">Discount:</span> {selectedInstrument.discount_rate ? `${selectedInstrument.discount_rate}%` : 'N/A'}</div>
                  <div><span className="text-gray-600">Valuation Cap:</span> {selectedInstrument.valuation_cap ? formatCurrency(selectedInstrument.valuation_cap) : 'N/A'}</div>
                  <div><span className="text-gray-600">Type:</span> {selectedInstrument.instrument_type}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Triggering Fundraising Round *</label>
                  {fundraisingRounds.length === 0 ? (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      No fundraising rounds available. Please create a fundraising round first to convert this instrument.
                    </div>
                  ) : (
                    <select
                      required
                      value={convertFormData.round_id}
                      onChange={(e) => {
                        const round = fundraisingRounds.find(r => r.id === e.target.value)
                        setConvertFormData({ 
                          ...convertFormData, 
                          round_id: e.target.value,
                          conversion_price: round?.price_per_share?.toString() || ''
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a round...</option>
                      {fundraisingRounds.map((round) => (
                        <option key={round.id} value={round.id}>
                          {round.round_name} - {new Date(round.close_date).toLocaleDateString()}
                          {round.price_per_share && ` (${formatCurrency(round.price_per_share, 2)}/share)`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equity Type *</label>
                  <select
                    required
                    value={convertFormData.equity_type}
                    onChange={(e) => setConvertFormData({ ...convertFormData, equity_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="preferred_stock">Preferred Stock</option>
                    <option value="common_stock">Common Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Price per Share *</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={convertFormData.conversion_price}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value)
                      const shares = price > 0 ? (selectedInstrument.principal_amount / price).toFixed(4) : ''
                      setConvertFormData({ 
                        ...convertFormData, 
                        conversion_price: e.target.value,
                        shares: shares
                      })
                    }}
                    placeholder="e.g., 1.50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The price at which the instrument converts to equity
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resulting Shares *</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={convertFormData.shares}
                    onChange={(e) => setConvertFormData({ ...convertFormData, shares: e.target.value })}
                    placeholder="Calculated automatically"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Principal ({formatCurrency(selectedInstrument.principal_amount)}) ÷ Conversion Price = Shares
                  </p>
                </div>

                {/* Summary */}
                {convertFormData.shares && convertFormData.conversion_price && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Conversion Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Principal Amount:</span>
                        <span className="font-medium">{formatCurrency(selectedInstrument.principal_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversion Price:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(convertFormData.conversion_price), 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shares to Issue:</span>
                        <span className="font-medium">{parseFloat(convertFormData.shares).toLocaleString()} shares</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-green-200">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(convertFormData.shares) * parseFloat(convertFormData.conversion_price))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertModal(false)
                    setSelectedInstrument(null)
                    setConvertFormData({
                      round_id: '',
                      equity_type: 'preferred_stock',
                      conversion_price: '',
                      shares: ''
                    })
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertLoading || fundraisingRounds.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {convertLoading ? 'Converting...' : 'Convert to Equity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
