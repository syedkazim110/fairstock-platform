import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanyDocuments } from '@/app/actions/documents'
import DocumentsView from './DocumentsView'

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: companyId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/error')
  }

  // First get basic company info to check ownership
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!company) {
    redirect('/dashboard')
  }

  // Check if user is the owner
  const isOwner = company.owner_id === user.id

  // Check if user is a board member
  const { data: membershipCheck } = await supabase
    .from('company_members')
    .select('role, status')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()

  const isBoardMember = membershipCheck?.status === 'active' && membershipCheck?.role === 'board_member'

  // User must be either owner or board member
  if (!isOwner && !isBoardMember) {
    redirect('/dashboard')
  }

  // Get company members for the upload modal
  // Use service role client to bypass RLS and fetch all members
  const serviceClient = createServiceRoleClient()
  const { data: members } = await serviceClient
    .from('company_members')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')

  // Attach members to company object
  company.company_members = members || []

  // Get documents
  const { documents, error } = await getCompanyDocuments(companyId)

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Error loading documents: {error}
        </div>
      </div>
    )
  }

  // Get board members for upload modal
  const boardMembers = company.company_members
    ?.filter((member: any) => member.status === 'active' && member.role === 'board_member')
    .map((member: any) => ({
      id: member.user_id,
      full_name: member.profiles?.full_name,
      email: member.profiles?.email,
    })) || []

  return (
    <DocumentsView
      companyId={companyId}
      companyName={company.name}
      isOwner={isOwner}
      documents={documents || []}
      boardMembers={boardMembers}
    />
  )
}
