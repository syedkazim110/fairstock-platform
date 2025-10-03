import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateCompanyModal from '@/components/company/CreateCompanyModal'
import CompanyList from '@/components/company/CompanyList'
import MyHoldings from '@/components/dashboard/MyHoldings'
import { signOut } from '@/app/actions/auth'
import { getPendingDocuments } from '@/app/actions/documents'
import DashboardPendingDocuments from '@/components/dashboard/DashboardPendingDocuments'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // PHASE 1 & 3: Parallelize all queries using Promise.all()
  // First, get basic user info and memberships to determine accessible companies
  const [
    { data: profile },
    { data: ownedCompanies },
    { data: membershipData },
    { data: capTableHoldings },
    { data: equityGrantHoldings },
    { data: convertibleHoldings },
    { signatures: pendingSignatures }
  ] = await Promise.all([
    // PHASE 4: Get user profile - only needed columns
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single(),

    // PHASE 4: Get companies owned by the user - only needed columns
    supabase
      .from('companies')
      .select('id, name, description, owner_id, created_at, authorized_shares, share_calculation_method, updated_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),

    // Get companies where user is a board member
    supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('role', 'board_member')
      .eq('status', 'active'),

    // PHASE 4: Get user's holdings - only needed columns
    supabase
      .from('cap_table_entries')
      .select('id, company_id, shares, holder_type, equity_type, user_id, holder_email, total_value')
      .or(`user_id.eq.${user.id},holder_email.eq.${user.email}`),

    // PHASE 4: Get user's equity grants - only needed columns
    supabase
      .from('equity_grants')
      .select('id, company_id, total_shares, grant_type, user_id, recipient_email, vested_shares, exercise_price')
      .or(`user_id.eq.${user.id},recipient_email.eq.${user.email}`),

    // PHASE 4: Get user's convertible instruments - only needed columns
    supabase
      .from('convertible_instruments')
      .select('id, company_id, instrument_type, user_id, investor_email, principal_amount, valuation_cap')
      .or(`user_id.eq.${user.id},investor_email.eq.${user.email}`),

    // Get pending documents for signature
    getPendingDocuments()
  ])

  // PHASE 3: Get all unique company IDs from all sources
  const allCompanyIds = new Set([
    ...(ownedCompanies?.map(c => c.id) || []),
    ...(membershipData?.map(m => m.company_id) || []),
    ...(capTableHoldings?.map(h => h.company_id) || []),
    ...(equityGrantHoldings?.map(h => h.company_id) || []),
    ...(convertibleHoldings?.map(h => h.company_id) || [])
  ])

  // PHASE 3 & 4: Fetch companies - only needed columns
  // PHASE 5: Now fetch cap table entries only for accessible companies (smart filtering)
  const [
    { data: allCompanies },
    { data: allCapTableEntries }
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, description, owner_id, created_at, authorized_shares, share_calculation_method, updated_at')
      .in('id', Array.from(allCompanyIds)),
    
    // PHASE 5: Only fetch cap table entries for companies user has access to
    allCompanyIds.size > 0
      ? supabase
          .from('cap_table_entries')
          .select('company_id, shares, equity_type')
          .in('company_id', Array.from(allCompanyIds))
      : Promise.resolve({ data: [] })
  ])

  // Create a map for quick company lookup
  const companiesMap: Record<string, any> = {}
  allCompanies?.forEach(company => {
    companiesMap[company.id] = company
  })

  // Separate companies by type
  const memberCompanies = membershipData
    ?.map(m => companiesMap[m.company_id])
    .filter(Boolean) || []

  // PHASE 2: Calculate total shares for each company in-memory (no N+1 queries!)
  const companyTotalShares: Record<string, number> = {}
  allCapTableEntries?.forEach((entry: any) => {
    if (entry.equity_type !== 'option') {
      companyTotalShares[entry.company_id] = 
        (companyTotalShares[entry.company_id] || 0) + Number(entry.shares)
    }
  })

  // Combine all holdings with company data
  const holdings = [
    ...(capTableHoldings?.map((h: any) => ({
      capTableEntry: h,
      company: companiesMap[h.company_id],
      totalShares: companyTotalShares[h.company_id]
    })) || []),
    ...(equityGrantHoldings?.map((h: any) => ({
      equityGrant: h,
      company: companiesMap[h.company_id]
    })) || []),
    ...(convertibleHoldings?.map((h: any) => ({
      convertibleInstrument: h,
      company: companiesMap[h.company_id]
    })) || [])
  ]

  // Filter out holdings for companies the user owns
  const shareholderHoldings = holdings.filter((h: any) => 
    h.company && h.company.owner_id !== user.id
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {profile?.full_name || profile?.email || 'User'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/profile"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Profile
              </a>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Signatures Section */}
        {pendingSignatures && pendingSignatures.length > 0 && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Signatures
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Documents waiting for your signature
              </p>
            </div>
            <DashboardPendingDocuments signatures={pendingSignatures} />
          </div>
        )}

        {/* My Companies Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">My Companies</h2>
              <p className="text-gray-600 text-sm mt-1">
                Companies you own and manage
              </p>
            </div>
            <CreateCompanyModal />
          </div>
          
          {ownedCompanies && ownedCompanies.length > 0 ? (
            <CompanyList companies={ownedCompanies} isOwner={true} />
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No companies yet</h3>
              <p className="mt-2 text-gray-600">
                Get started by creating your first company
              </p>
              <div className="mt-6">
                <CreateCompanyModal />
              </div>
            </div>
          )}
        </div>

        {/* My Holdings Section */}
        {shareholderHoldings.length > 0 && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">My Holdings</h2>
              <p className="text-gray-600 text-sm mt-1">
                Your equity holdings in companies
              </p>
            </div>
            <MyHoldings holdings={shareholderHoldings} />
          </div>
        )}

        {/* Board Memberships Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Board Memberships</h2>
            <p className="text-gray-600 text-sm mt-1">
              Companies where you are a board member
            </p>
          </div>

          {memberCompanies && memberCompanies.length > 0 ? (
            <CompanyList companies={memberCompanies} isOwner={false} />
          ) : (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-4 text-base font-medium text-gray-900">
                No board memberships
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                You haven&apos;t been invited to any companies yet
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
