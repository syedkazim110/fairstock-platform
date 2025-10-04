import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { MyCompaniesSection } from '@/components/dashboard/MyCompaniesSection'
import { MyHoldingsSection } from '@/components/dashboard/MyHoldingsSection'
import { BoardMembershipsSection } from '@/components/dashboard/BoardMembershipsSection'
import { PendingSignaturesSection } from '@/components/dashboard/PendingSignaturesSection'
import {
  CompanyListSkeleton,
  HoldingsListSkeleton,
  PendingDocumentsSkeleton,
  EmptyStateSkeleton
} from '@/components/dashboard/LoadingSkeletons'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Only fetch minimal user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

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
        {/* Pending Signatures Section - Load independently */}
        <Suspense fallback={
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Signatures
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Documents waiting for your signature
              </p>
            </div>
            <PendingDocumentsSkeleton />
          </div>
        }>
          <PendingSignaturesSection />
        </Suspense>

        {/* My Companies Section - Load independently */}
        <Suspense fallback={
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">My Companies</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Companies you own and manage
                </p>
              </div>
            </div>
            <CompanyListSkeleton />
          </div>
        }>
          <MyCompaniesSection userId={user.id} />
        </Suspense>

        {/* My Holdings Section - Load independently */}
        <Suspense fallback={
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">My Holdings</h2>
              <p className="text-gray-600 text-sm mt-1">
                Your equity holdings in companies
              </p>
            </div>
            <HoldingsListSkeleton />
          </div>
        }>
          <MyHoldingsSection userId={user.id} userEmail={user.email || ''} />
        </Suspense>

        {/* Board Memberships Section - Load independently */}
        <Suspense fallback={
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Board Memberships</h2>
              <p className="text-gray-600 text-sm mt-1">
                Companies where you are a board member
              </p>
            </div>
            <EmptyStateSkeleton />
          </div>
        }>
          <BoardMembershipsSection userId={user.id} />
        </Suspense>
      </div>
    </main>
  )
}
