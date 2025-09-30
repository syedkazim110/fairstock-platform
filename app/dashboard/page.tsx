import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateCompanyModal from '@/components/company/CreateCompanyModal'
import CompanyList from '@/components/company/CompanyList'
import MyHoldings from '@/components/dashboard/MyHoldings'
import { signOut } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get companies owned by the user
  const { data: ownedCompanies } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  // Get companies where user is a board member
  const { data: membershipData } = await supabase
    .from('company_members')
    .select(`
      *,
      companies (*)
    `)
    .eq('user_id', user.id)
    .eq('role', 'board_member')
    .eq('status', 'active')

  const memberCompanies = membershipData?.map((m: any) => m.companies) || []

  // Get user's holdings (cap table entries) - without companies relationship to avoid RLS recursion
  const { data: capTableHoldings } = await supabase
    .from('cap_table_entries')
    .select('*')
    .or(`user_id.eq.${user.id},holder_email.eq.${profile?.email}`)

  // Get user's equity grants
  const { data: equityGrantHoldings } = await supabase
    .from('equity_grants')
    .select('*')
    .or(`user_id.eq.${user.id},recipient_email.eq.${profile?.email}`)

  // Get user's convertible instruments
  const { data: convertibleHoldings } = await supabase
    .from('convertible_instruments')
    .select('*')
    .or(`user_id.eq.${user.id},investor_email.eq.${profile?.email}`)

  // Get unique company IDs from all holdings
  const companyIds = new Set([
    ...(capTableHoldings?.map(h => h.company_id) || []),
    ...(equityGrantHoldings?.map(h => h.company_id) || []),
    ...(convertibleHoldings?.map(h => h.company_id) || [])
  ])

  // Fetch companies separately using service role to bypass RLS
  const { data: holdingCompanies } = await supabase
    .from('companies')
    .select('*')
    .in('id', Array.from(companyIds))

  // Create a map for quick company lookup
  const companiesMap: Record<string, any> = {}
  holdingCompanies?.forEach(company => {
    companiesMap[company.id] = company
  })

  // Get total shares for each company to calculate ownership percentage
  const uniqueCompanyIds = new Set([
    ...(capTableHoldings?.map((h: any) => h.company_id) || []),
    ...(equityGrantHoldings?.map((h: any) => h.company_id) || []),
    ...(convertibleHoldings?.map((h: any) => h.company_id) || [])
  ])

  const companyTotalShares: Record<string, number> = {}
  for (const companyId of uniqueCompanyIds) {
    const { data: allEntries } = await supabase
      .from('cap_table_entries')
      .select('shares')
      .eq('company_id', companyId)
      .neq('equity_type', 'option')
    
    const total = allEntries?.reduce((sum: number, entry: any) => sum + Number(entry.shares), 0) || 0
    companyTotalShares[companyId] = total
  }

  // Combine all holdings with company data from the map
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

  // Filter out holdings for companies the user owns (they see those in "My Companies" section)
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
