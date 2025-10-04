import { createClient } from '@/lib/supabase/server'
import CompanyList from '@/components/company/CompanyList'
import { Database } from '@/lib/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']

export async function BoardMembershipsSection({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: membershipData } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'board_member')
    .eq('status', 'active')

  const companyIds = membershipData?.map(m => m.company_id) || []

  let memberCompanies: Company[] = []
  if (companyIds.length > 0) {
    const { data } = await supabase
      .from('companies')
      .select('id, name, description, owner_id, created_at, authorized_shares, share_calculation_method, updated_at')
      .in('id', companyIds)
    
    memberCompanies = data || []
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Board Memberships</h2>
        <p className="text-gray-600 text-sm mt-1">
          Companies where you are a board member
        </p>
      </div>

      {memberCompanies.length > 0 ? (
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
  )
}
