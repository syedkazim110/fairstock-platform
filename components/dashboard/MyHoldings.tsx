'use client'

import Link from 'next/link'
import { Database } from '@/lib/types/database.types'

type CapTableEntry = Database['public']['Tables']['cap_table_entries']['Row']
type Company = Database['public']['Tables']['companies']['Row']
type EquityGrant = Database['public']['Tables']['equity_grants']['Row']
type ConvertibleInstrument = Database['public']['Tables']['convertible_instruments']['Row']

interface HoldingWithCompany {
  capTableEntry?: CapTableEntry
  equityGrant?: EquityGrant
  convertibleInstrument?: ConvertibleInstrument
  company: Company
  totalShares?: number
}

interface MyHoldingsProps {
  holdings: HoldingWithCompany[]
}

export default function MyHoldings({ holdings }: MyHoldingsProps) {
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

  const getOwnershipPercentage = (shares: number, totalShares?: number) => {
    if (!totalShares || totalShares === 0) return 0
    return (shares / totalShares) * 100
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <svg
          className="mx-auto h-10 w-10 text-gray-400"
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
        <h3 className="mt-4 text-base font-medium text-gray-900">
          No holdings yet
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          You don&apos;t have any equity holdings at the moment
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {holdings.map((holding, index) => {
        const { company, capTableEntry, equityGrant, convertibleInstrument, totalShares } = holding
        
        // Determine holding type and relevant data
        let holdingType = ''
        let shares = 0
        let holderType = ''
        let equityType = ''
        let ownershipPercent = 0
        let value = null

        if (capTableEntry) {
          holdingType = 'Equity'
          shares = Number(capTableEntry.shares)
          holderType = capTableEntry.holder_type
          equityType = capTableEntry.equity_type
          ownershipPercent = getOwnershipPercentage(shares, totalShares)
          value = capTableEntry.total_value
        } else if (equityGrant) {
          holdingType = 'Grant'
          shares = Number(equityGrant.total_shares)
          holderType = 'employee'
          equityType = equityGrant.grant_type
          value = equityGrant.exercise_price ? Number(equityGrant.exercise_price) * shares : null
        } else if (convertibleInstrument) {
          holdingType = 'Convertible'
          holderType = 'investor'
          equityType = convertibleInstrument.instrument_type
          value = Number(convertibleInstrument.principal_amount)
        }

        return (
          <Link
            key={index}
            href={`/company/${company.id}`}
            className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {company.name}
                </h3>
                {company.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {company.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
                    {holderType.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                    {equityType.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    {holdingType}
                  </span>
                </div>
              </div>
              
              <div className="text-right ml-4">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
              {shares > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Shares</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatNumber(shares)}
                  </p>
                </div>
              )}
              
              {ownershipPercent > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Ownership</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {ownershipPercent.toFixed(2)}%
                  </p>
                </div>
              )}
              
              {value !== null && (
                <div>
                  <p className="text-xs text-gray-500">Value</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatCurrency(value)}
                  </p>
                </div>
              )}

              {equityGrant && (
                <div>
                  <p className="text-xs text-gray-500">Vested</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatNumber(Number(equityGrant.vested_shares))} / {formatNumber(Number(equityGrant.total_shares))}
                  </p>
                </div>
              )}

              {convertibleInstrument && convertibleInstrument.valuation_cap && (
                <div>
                  <p className="text-xs text-gray-500">Valuation Cap</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatCurrency(Number(convertibleInstrument.valuation_cap))}
                  </p>
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
