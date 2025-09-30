import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DebugHoldings2Page() {
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

  // Test the exact query from dashboard
  const { data: capTableHoldings, error: capError } = await supabase
    .from('cap_table_entries')
    .select(`
      *,
      companies (*)
    `)
    .or(`user_id.eq.${user.id},holder_email.eq.${profile?.email}`)

  // Combine holdings like dashboard does
  const holdings = [
    ...(capTableHoldings?.map((h: any) => ({
      capTableEntry: h,
      company: h.companies,
      totalShares: 0
    })) || [])
  ]

  // Filter like dashboard does
  const shareholderHoldings = holdings.filter((h: any) => 
    h.company && h.company.owner_id !== user.id
  )

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Holdings - Step 2</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">User Info</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify({ 
              userId: user.id, 
              email: profile?.email
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Raw Query Result</h2>
          <p className="text-sm text-gray-600 mb-2">Found: {capTableHoldings?.length || 0} entries</p>
          {capError && <p className="text-red-600 mb-2">Error: {capError.message}</p>}
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(capTableHoldings, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Holdings Array (after mapping)</h2>
          <p className="text-sm text-gray-600 mb-2">Count: {holdings.length}</p>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(holdings.map(h => ({
              hasCompany: !!h.company,
              companyId: h.capTableEntry?.company_id,
              companyData: h.company,
              holderName: h.capTableEntry?.holder_name
            })), null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Filtered Shareholder Holdings</h2>
          <p className="text-sm text-gray-600 mb-2">Count: {shareholderHoldings.length}</p>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(shareholderHoldings, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Diagnosis:</h3>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
            <li>If "companies" is null in raw query, the relationship isn't working</li>
            <li>If hasCompany is false, we need to fix the relationship name</li>
            <li>If filtered count is 0 but holdings count &gt; 0, check company.owner_id</li>
          </ul>
        </div>

        <a href="/dashboard" className="inline-block mt-6 text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </a>
      </div>
    </main>
  )
}
