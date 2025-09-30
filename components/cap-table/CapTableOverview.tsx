'use client'

import { Database } from '@/lib/types/database.types'
import { useMemo } from 'react'

type Company = Database['public']['Tables']['companies']['Row']
type CapTableEntry = Database['public']['Tables']['cap_table_entries']['Row']
type EquityGrant = Database['public']['Tables']['equity_grants']['Row']
type ConvertibleInstrument = Database['public']['Tables']['convertible_instruments']['Row']
type FundraisingRound = Database['public']['Tables']['fundraising_rounds']['Row']
type OptionPool = Database['public']['Tables']['option_pools']['Row']

interface CapTableOverviewProps {
  company: Company
  isOwner: boolean
  capTableEntries: CapTableEntry[]
  equityGrants: EquityGrant[]
  convertibleInstruments: ConvertibleInstrument[]
  fundraisingRounds: FundraisingRound[]
  optionPools: OptionPool[]
}

export default function CapTableOverview({
  company,
  isOwner,
  capTableEntries,
  equityGrants,
  convertibleInstruments,
  fundraisingRounds,
  optionPools
}: CapTableOverviewProps) {
  
  // Calculate total shares and ownership percentages
  const calculations = useMemo(() => {
    // Total issued shares from cap table entries (excluding options)
    const issuedShares = capTableEntries
      .filter(entry => entry.equity_type !== 'option')
      .reduce((sum, entry) => sum + Number(entry.shares), 0)
    
    // Total option grants (vested + unvested)
    const totalOptionsGranted = equityGrants
      .reduce((sum, grant) => sum + Number(grant.total_shares), 0)
    
    // Total vested options
    const vestedOptions = equityGrants
      .reduce((sum, grant) => sum + Number(grant.vested_shares), 0)
    
    // Total exercised options
    const exercisedOptions = equityGrants
      .reduce((sum, grant) => sum + Number(grant.exercised_shares), 0)
    
    // Outstanding SAFEs and convertible notes
    const outstandingSAFEs = convertibleInstruments
      .filter(inst => inst.status === 'outstanding')
      .reduce((sum, inst) => sum + Number(inst.principal_amount), 0)
    
    // Option pool availability
    const totalOptionPoolShares = optionPools
      .reduce((sum, pool) => sum + Number(pool.total_shares), 0)
    
    const grantedFromPool = optionPools
      .reduce((sum, pool) => sum + Number(pool.granted_shares), 0)
    
    const availableInPool = optionPools
      .reduce((sum, pool) => sum + Number(pool.available_shares), 0)
    
    // Fully diluted shares (issued + all options granted)
    const fullyDilutedShares = issuedShares + totalOptionsGranted
    
    // Calculate ownership by holder type
    const ownershipByType = capTableEntries
      .filter(entry => entry.equity_type !== 'option')
      .reduce((acc, entry) => {
        const shares = Number(entry.shares)
        if (!acc[entry.holder_type]) {
          acc[entry.holder_type] = { shares: 0, percentage: 0 }
        }
        acc[entry.holder_type].shares += shares
        return acc
      }, {} as Record<string, { shares: number; percentage: number }>)
    
    // Calculate percentages
    Object.keys(ownershipByType).forEach(type => {
      ownershipByType[type].percentage = fullyDilutedShares > 0 
        ? (ownershipByType[type].shares / fullyDilutedShares) * 100 
        : 0
    })
    
    // Latest funding round
    const latestRound = fundraisingRounds[0]
    
    return {
      issuedShares,
      totalOptionsGranted,
      vestedOptions,
      exercisedOptions,
      fullyDilutedShares,
      outstandingSAFEs,
      totalOptionPoolShares,
      grantedFromPool,
      availableInPool,
      ownershipByType,
      latestRound
    }
  }, [capTableEntries, equityGrants, convertibleInstruments, optionPools, fundraisingRounds])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num))
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Issued Shares</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(calculations.issuedShares)}</div>
          <div className="text-xs text-gray-500 mt-1">Outstanding equity</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Fully Diluted</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(calculations.fullyDilutedShares)}</div>
          <div className="text-xs text-gray-500 mt-1">Including all options</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Option Pool</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(calculations.availableInPool)}</div>
          <div className="text-xs text-gray-500 mt-1">Available of {formatNumber(calculations.totalOptionPoolShares)}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Outstanding SAFEs</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(calculations.outstandingSAFEs)}</div>
          <div className="text-xs text-gray-500 mt-1">Not yet converted</div>
        </div>
      </div>

      {/* Latest Valuation */}
      {calculations.latestRound && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Valuation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Round</div>
              <div className="text-xl font-bold text-gray-900">
                {calculations.latestRound.round_name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(calculations.latestRound.close_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Post-Money Valuation</div>
              <div className="text-xl font-bold text-gray-900">
                {calculations.latestRound.valuation_post_money 
                  ? formatCurrency(calculations.latestRound.valuation_post_money)
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Amount Raised</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(calculations.latestRound.amount_raised)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ownership Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ownership by Holder Type</h3>
        <div className="space-y-3">
          {Object.entries(calculations.ownershipByType).map(([type, data]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {type.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-900">
                  {formatNumber(data.shares)} ({formatPercentage(data.percentage)})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cap Table Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cap Table Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holder
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ownership %
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {capTableEntries
                .filter(entry => entry.equity_type !== 'option')
                .map((entry) => {
                  const ownership = calculations.fullyDilutedShares > 0
                    ? (Number(entry.shares) / calculations.fullyDilutedShares) * 100
                    : 0
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.holder_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(entry.shares)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatPercentage(ownership)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {entry.equity_type.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      {isOwner && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Cap Table</h3>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Export to Excel
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Export to PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
