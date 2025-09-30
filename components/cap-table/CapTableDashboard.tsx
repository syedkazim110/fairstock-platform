'use client'

import { useState } from 'react'
import { Database } from '@/lib/types/database.types'
import CapTableOverview from './CapTableOverview'
import ShareholdersTab from './ShareholdersTab'
import EquityGrantsTab from './EquityGrantsTab'
import TransactionsTab from './TransactionsTab'
import ConvertibleInstrumentsTab from './ConvertibleInstrumentsTab'
import FundraisingRoundsTab from './FundraisingRoundsTab'

type Company = Database['public']['Tables']['companies']['Row']
type CapTableEntry = Database['public']['Tables']['cap_table_entries']['Row']
type EquityGrant = Database['public']['Tables']['equity_grants']['Row']
type Transaction = Database['public']['Tables']['equity_transactions']['Row']
type ConvertibleInstrument = Database['public']['Tables']['convertible_instruments']['Row']
type FundraisingRound = Database['public']['Tables']['fundraising_rounds']['Row']
type OptionPool = Database['public']['Tables']['option_pools']['Row']

interface CapTableDashboardProps {
  company: Company
  isOwner: boolean
  capTableEntries: CapTableEntry[]
  equityGrants: EquityGrant[]
  transactions: Transaction[]
  convertibleInstruments: ConvertibleInstrument[]
  fundraisingRounds: FundraisingRound[]
  optionPools: OptionPool[]
}

type TabType = 'overview' | 'shareholders' | 'grants' | 'transactions' | 'convertibles' | 'rounds'

export default function CapTableDashboard({
  company,
  isOwner,
  capTableEntries,
  equityGrants,
  transactions,
  convertibleInstruments,
  fundraisingRounds,
  optionPools
}: CapTableDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: '📊' },
    { id: 'shareholders' as TabType, name: 'Shareholders', icon: '👥' },
    { id: 'grants' as TabType, name: 'Equity Grants', icon: '🎁' },
    { id: 'transactions' as TabType, name: 'Transactions', icon: '📝' },
    { id: 'convertibles' as TabType, name: 'Convertibles', icon: '💰' },
    { id: 'rounds' as TabType, name: 'Funding Rounds', icon: '🚀' }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <CapTableOverview
          company={company}
          isOwner={isOwner}
          capTableEntries={capTableEntries}
          equityGrants={equityGrants}
          convertibleInstruments={convertibleInstruments}
          fundraisingRounds={fundraisingRounds}
          optionPools={optionPools}
        />
      )}

      {activeTab === 'shareholders' && (
        <ShareholdersTab
          company={company}
          isOwner={isOwner}
          capTableEntries={capTableEntries}
        />
      )}

      {activeTab === 'grants' && (
        <EquityGrantsTab
          company={company}
          isOwner={isOwner}
          equityGrants={equityGrants}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTab
          company={company}
          isOwner={isOwner}
          transactions={transactions}
        />
      )}

      {activeTab === 'convertibles' && (
        <ConvertibleInstrumentsTab
          company={company}
          isOwner={isOwner}
          convertibleInstruments={convertibleInstruments}
        />
      )}

      {activeTab === 'rounds' && (
        <FundraisingRoundsTab
          company={company}
          isOwner={isOwner}
          fundraisingRounds={fundraisingRounds}
        />
      )}
    </div>
  )
}
