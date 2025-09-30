'use client'

import { Database } from '@/lib/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']
type CapTableEntry = Database['public']['Tables']['cap_table_entries']['Row']
type EquityGrant = Database['public']['Tables']['equity_grants']['Row']
type ConvertibleInstrument = Database['public']['Tables']['convertible_instruments']['Row']

interface ShareholderViewProps {
  company: Company
  capTableEntries: CapTableEntry[]
  equityGrants: EquityGrant[]
  convertibleInstruments: ConvertibleInstrument[]
  totalShares: number
}

export default function ShareholderView({
  company,
  capTableEntries,
  equityGrants,
  convertibleInstruments,
  totalShares
}: ShareholderViewProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num))
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  const getOwnershipPercentage = (shares: number) => {
    if (!totalShares || totalShares === 0) return 0
    return (shares / totalShares) * 100
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <a 
                href="/dashboard" 
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </a>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.description && (
                <p className="text-gray-600 mt-1">{company.description}</p>
              )}
              <div className="mt-2">
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  Shareholder View
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cap Table Entries */}
        {capTableEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">My Equity Holdings</h2>
              <p className="text-sm text-gray-600 mt-1">Your ownership in this company</p>
            </div>
            <div className="p-6 space-y-6">
              {capTableEntries.map((entry) => {
                const ownershipPercent = getOwnershipPercentage(Number(entry.shares))
                return (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
                        {entry.holder_type.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                        {entry.equity_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Shares</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {formatNumber(entry.shares)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ownership</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {ownershipPercent.toFixed(2)}%
                        </p>
                      </div>
                      {entry.price_per_share && (
                        <div>
                          <p className="text-xs text-gray-500">Price/Share</p>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            {formatCurrency(entry.price_per_share)}
                          </p>
                        </div>
                      )}
                      {entry.total_value && (
                        <div>
                          <p className="text-xs text-gray-500">Total Value</p>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            {formatCurrency(entry.total_value)}
                          </p>
                        </div>
                      )}
                    </div>
                    {entry.issue_date && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Issue Date</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(entry.issue_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Notes</p>
                        <p className="text-sm text-gray-900 mt-1">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Equity Grants */}
        {equityGrants.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">My Equity Grants</h2>
              <p className="text-sm text-gray-600 mt-1">Your option grants and vesting schedule</p>
            </div>
            <div className="p-6 space-y-6">
              {equityGrants.map((grant) => (
                <div key={grant.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      {grant.grant_type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      grant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {grant.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Total Shares</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatNumber(grant.total_shares)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Vested</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatNumber(grant.vested_shares)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Exercised</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatNumber(grant.exercised_shares)}
                      </p>
                    </div>
                    {grant.exercise_price && (
                      <div>
                        <p className="text-xs text-gray-500">Exercise Price</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {formatCurrency(grant.exercise_price)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Grant Date</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(grant.grant_date).toLocaleDateString()}
                      </p>
                    </div>
                    {grant.vesting_start_date && (
                      <div>
                        <p className="text-xs text-gray-500">Vesting Start</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(grant.vesting_start_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Vesting Period</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {grant.vesting_duration_months} months / {grant.cliff_months} month cliff
                      </p>
                    </div>
                  </div>
                  {grant.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm text-gray-900 mt-1">{grant.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Convertible Instruments */}
        {convertibleInstruments.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">My Convertible Instruments</h2>
              <p className="text-sm text-gray-600 mt-1">Your SAFEs and convertible notes</p>
            </div>
            <div className="p-6 space-y-6">
              {convertibleInstruments.map((instrument) => (
                <div key={instrument.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                      {instrument.instrument_type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      instrument.status === 'outstanding' ? 'bg-yellow-100 text-yellow-800' : 
                      instrument.status === 'converted' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {instrument.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Principal Amount</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatCurrency(instrument.principal_amount)}
                      </p>
                    </div>
                    {instrument.valuation_cap && (
                      <div>
                        <p className="text-xs text-gray-500">Valuation Cap</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {formatCurrency(instrument.valuation_cap)}
                        </p>
                      </div>
                    )}
                    {instrument.discount_rate && (
                      <div>
                        <p className="text-xs text-gray-500">Discount Rate</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {instrument.discount_rate}%
                        </p>
                      </div>
                    )}
                    {instrument.interest_rate && (
                      <div>
                        <p className="text-xs text-gray-500">Interest Rate</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {instrument.interest_rate}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Issue Date</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(instrument.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    {instrument.maturity_date && (
                      <div>
                        <p className="text-xs text-gray-500">Maturity Date</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(instrument.maturity_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {instrument.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm text-gray-900 mt-1">{instrument.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Holdings Message */}
        {capTableEntries.length === 0 && equityGrants.length === 0 && convertibleInstruments.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Holdings</h3>
            <p className="mt-2 text-gray-600">
              You don&apos;t have any holdings in this company yet
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
