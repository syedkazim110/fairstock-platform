import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CapTableDashboard from '@/components/cap-table/CapTableDashboard'

export default async function CapTablePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get company details
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .single()

  if (companyError || !company) {
    redirect('/dashboard')
  }

  // Check if user is owner
  const isOwner = company.owner_id === user.id

  // Check if user is board member
  const { data: membership } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', params.id)
    .eq('user_id', user.id)
    .eq('role', 'board_member')
    .eq('status', 'active')
    .single()

  const isBoardMember = !!membership

  // If user has no access, redirect
  if (!isOwner && !isBoardMember) {
    redirect('/dashboard')
  }

  // Get cap table data
  const { data: capTableEntries } = await supabase
    .from('cap_table_entries')
    .select('*')
    .eq('company_id', params.id)
    .order('created_at', { ascending: false })

  // Get equity grants
  const { data: equityGrants } = await supabase
    .from('equity_grants')
    .select('*')
    .eq('company_id', params.id)
    .order('grant_date', { ascending: false })

  // Get transactions
  const { data: transactions } = await supabase
    .from('equity_transactions')
    .select('*')
    .eq('company_id', params.id)
    .order('transaction_date', { ascending: false })

  // Get convertible instruments
  const { data: convertibleInstruments } = await supabase
    .from('convertible_instruments')
    .select('*')
    .eq('company_id', params.id)
    .order('issue_date', { ascending: false })

  // Get fundraising rounds
  const { data: fundraisingRounds } = await supabase
    .from('fundraising_rounds')
    .select('*')
    .eq('company_id', params.id)
    .order('close_date', { ascending: false })

  // Get option pools
  const { data: optionPools } = await supabase
    .from('option_pools')
    .select('*')
    .eq('company_id', params.id)
    .order('created_date', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
                <span>/</span>
                <a href={`/company/${company.id}`} className="hover:text-gray-900">{company.name}</a>
                <span>/</span>
                <span className="text-gray-900">Cap Table</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Cap Table</h1>
              <p className="text-gray-600 mt-1">{company.name}</p>
            </div>
            <div className="flex items-center gap-4">
              {isOwner && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Owner
                </span>
              )}
              {isBoardMember && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  Board Member (View Only)
                </span>
              )}
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      <CapTableDashboard
        company={company}
        isOwner={isOwner}
        capTableEntries={capTableEntries || []}
        equityGrants={equityGrants || []}
        transactions={transactions || []}
        convertibleInstruments={convertibleInstruments || []}
        fundraisingRounds={fundraisingRounds || []}
        optionPools={optionPools || []}
      />
    </main>
  )
}
