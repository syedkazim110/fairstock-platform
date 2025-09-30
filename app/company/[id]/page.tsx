import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ShareholderView from '@/components/company/ShareholderView'

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params
  
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

  // First check if user is a board member
  const { data: membershipCheck } = await supabase
    .from('company_members')
    .select('role, status')
    .eq('company_id', id)
    .eq('user_id', user.id)
    .single()

  const isBoardMember = membershipCheck?.status === 'active' && membershipCheck?.role === 'board_member'

  // Get company details - use regular query first (for owners)
  let { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  // If company not found and user is a board member, it means RLS is blocking
  // Fetch using their membership verification instead
  if ((companyError || !company) && isBoardMember) {
    // Fetch company without RLS restriction since we've verified membership
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    
    company = companyData
  }

  if (!company) {
    notFound()
  }

  // Check if user is the owner
  const isOwner = company.owner_id === user.id

  // Get company members with their profile information
  const { data: members } = await supabase
    .from('company_members')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('company_id', id)
    .order('created_at', { ascending: true })

  // Check if user is a shareholder (has holdings in this company)
  const { data: shareholderCapTable } = await supabase
    .from('cap_table_entries')
    .select('*')
    .eq('company_id', id)
    .or(`user_id.eq.${user.id},holder_email.eq.${profile?.email}`)

  const { data: shareholderGrants } = await supabase
    .from('equity_grants')
    .select('*')
    .eq('company_id', id)
    .or(`user_id.eq.${user.id},recipient_email.eq.${profile?.email}`)

  const { data: shareholderInstruments } = await supabase
    .from('convertible_instruments')
    .select('*')
    .eq('company_id', id)
    .or(`user_id.eq.${user.id},investor_email.eq.${profile?.email}`)

  const isShareholder = 
    (shareholderCapTable && shareholderCapTable.length > 0) ||
    (shareholderGrants && shareholderGrants.length > 0) ||
    (shareholderInstruments && shareholderInstruments.length > 0)

  // Check if current user has any access to this company
  const hasAccess = isOwner || isBoardMember || isShareholder

  if (!hasAccess) {
    notFound()
  }

  // If user is only a shareholder (not owner or board member), show shareholder view
  if (!isOwner && !isBoardMember && isShareholder) {
    // Get total shares for ownership percentage calculation
    const { data: allEntries } = await supabase
      .from('cap_table_entries')
      .select('shares')
      .eq('company_id', id)
      .neq('equity_type', 'option')
    
    const totalShares = allEntries?.reduce((sum: number, entry: any) => sum + Number(entry.shares), 0) || 0

    return (
      <ShareholderView
        company={company}
        capTableEntries={shareholderCapTable || []}
        equityGrants={shareholderGrants || []}
        convertibleInstruments={shareholderInstruments || []}
        totalShares={totalShares}
      />
    )
  }

  // Otherwise show owner/board member view
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.description && (
                <p className="text-gray-600 mt-1">{company.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link
                  href={`/company/${id}/settings`}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Settings
                </Link>
              )}
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isOwner
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isOwner ? 'Owner' : 'Board Member'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href={`/company/${id}/cap-table`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Cap Table</h3>
                <p className="text-sm text-gray-600">Manage equity and ownership</p>
              </div>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </Link>

          <Link
            href={`/company/${id}/documents`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Documents</h3>
                <p className="text-sm text-gray-600">Manage signatures and files</p>
              </div>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Reports</h3>
                <p className="text-sm text-gray-600">Coming soon</p>
              </div>
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Company Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <p className="text-gray-900">{company.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created
              </label>
              <p className="text-gray-900">
                {new Date(company.created_at).toLocaleDateString()}
              </p>
            </div>
            {company.description && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900">{company.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Company Members
            </h2>
            {isOwner && (
              <Link
                href={`/company/${id}/members`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Manage Members
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.profiles?.full_name?.[0]?.toUpperCase() || 
                         member.profiles?.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.profiles?.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-sm text-gray-600">{member.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'owner'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {member.role === 'owner' ? 'Owner' : 'Board Member'}
                    </span>
                    {member.status === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center py-4">No members found</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
