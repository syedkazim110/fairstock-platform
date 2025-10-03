import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompanySettings from '@/components/company/CompanySettings'

export default async function CompanySettingsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/error')
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

  // Check if user is the owner
  const isOwner = company.owner_id === user.id

  if (!isOwner) {
    redirect(`/company/${params.id}`)
  }

  return <CompanySettings company={company} />
}
