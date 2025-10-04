import { createClient } from '@/lib/supabase/server'
import CompanyList from '@/components/company/CompanyList'
import CreateCompanyModal from '@/components/company/CreateCompanyModal'

export async function MyCompaniesSection({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: ownedCompanies } = await supabase
    .from('companies')
    .select('id, name, description, owner_id, created_at, authorized_shares, share_calculation_method, updated_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  return (
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
  )
}
