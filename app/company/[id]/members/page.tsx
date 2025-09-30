import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AddBoardMemberModal from '@/components/company/AddBoardMemberModal'
import RemoveMemberButton from '@/components/company/RemoveMemberButton'

export default async function CompanyMembersPage({ params }: { params: { id: string } }) {
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

  if (!isOwner) {
    // Only owners can manage members
    redirect(`/company/${id}`)
  }

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

  // Get owner's profile
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', company.owner_id)
    .single()

  // Combine owner and members
  const allMembers = [
    {
      id: 'owner',
      role: 'owner',
      status: 'active',
      profiles: ownerProfile,
      invited_at: company.created_at,
      isOwner: true
    },
    ...(members || []).map(m => ({ ...m, isOwner: false }))
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/company/${id}`}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm mb-2 inline-block"
              >
                ← Back to Company
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Members</h1>
              <p className="text-gray-600 mt-1">{company.name}</p>
            </div>
            <AddBoardMemberModal companyId={id} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                About Board Members
              </h3>
              <p className="text-sm text-blue-700">
                Board members can view all company information and the cap table. They cannot make changes to the company or its equity structure. Only owners have full control over the company.
              </p>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Company Members ({allMembers.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {allMembers.map((member: any) => (
              <div
                key={member.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {member.profiles?.full_name?.[0]?.toUpperCase() || 
                         member.profiles?.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {member.profiles?.full_name || 'Unnamed User'}
                        </p>
                        {member.isOwner && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{member.profiles?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {member.role === 'owner' ? 'Company Owner' : 'Board Member'} • 
                        Added {new Date(member.invited_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        member.role === 'owner'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {member.role === 'owner' ? 'Owner' : 'Board Member'}
                    </span>
                    
                    {member.status === 'pending' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                    
                    {!member.isOwner && member.role === 'board_member' && (
                      <RemoveMemberButton
                        companyId={id}
                        memberId={member.id}
                        memberName={member.profiles?.full_name || member.profiles?.email || 'this member'}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {(!members || members.length === 0) && (
          <div className="mt-6 text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No board members yet
            </h3>
            <p className="mt-2 text-gray-600">
              Add board members to give them access to view your company information
            </p>
            <div className="mt-6">
              <AddBoardMemberModal companyId={id} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
