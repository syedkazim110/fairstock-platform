import { createClient } from '@/lib/supabase/server'
import MyHoldings from '@/components/dashboard/MyHoldings'

export async function MyHoldingsSection({ userId, userEmail }: { userId: string; userEmail: string }) {
  const supabase = await createClient()

  const [
    { data: capTableHoldings },
    { data: equityGrantHoldings },
    { data: convertibleHoldings }
  ] = await Promise.all([
    supabase
      .from('cap_table_entries')
      .select('id, company_id, shares, holder_type, equity_type, user_id, holder_email, total_value')
      .or(`user_id.eq.${userId},holder_email.eq.${userEmail}`),
    
    supabase
      .from('equity_grants')
      .select('id, company_id, total_shares, grant_type, user_id, recipient_email, vested_shares, exercise_price')
      .or(`user_id.eq.${userId},recipient_email.eq.${userEmail}`),
    
    supabase
      .from('convertible_instruments')
      .select('id, company_id, instrument_type, user_id, investor_email, principal_amount, valuation_cap')
      .or(`user_id.eq.${userId},investor_email.eq.${userEmail}`)
  ])

  // Get unique company IDs
  const allCompanyIds = new Set([
    ...(capTableHoldings?.map(h => h.company_id) || []),
    ...(equityGrantHoldings?.map(h => h.company_id) || []),
    ...(convertibleHoldings?.map(h => h.company_id) || [])
  ])

  if (allCompanyIds.size === 0) {
    return null
  }

  // Fetch companies and cap table entries for calculations
  const [
    { data: allCompanies },
    { data: allCapTableEntries }
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, description, owner_id, created_at, authorized_shares, share_calculation_method, updated_at')
      .in('id', Array.from(allCompanyIds)),
    
    supabase
      .from('cap_table_entries')
      .select('company_id, shares, equity_type')
      .in('company_id', Array.from(allCompanyIds))
  ])

  // Create a map for quick company lookup
  const companiesMap: Record<string, any> = {}
  allCompanies?.forEach(company => {
    companiesMap[company.id] = company
  })

  // Calculate total shares for each company in-memory
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
    h.company && h.company.owner_id !== userId
  )

  if (shareholderHoldings.length === 0) {
    return null
  }

  return (
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Holdings</h2>
        <p className="text-gray-600 text-sm mt-1">
          Your equity holdings in companies
        </p>
      </div>
      <MyHoldings holdings={shareholderHoldings} />
    </div>
  )
}
