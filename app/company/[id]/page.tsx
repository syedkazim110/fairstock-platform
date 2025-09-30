import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get company details
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (companyError || !company) {
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

  // Check if current user has access to this company
  const hasAccess = isOwner || members?.some(m => m.user_id === user.id && m.status === 'active')

  if (!hasAccess) {
    notFound()
  }

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
