import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DebugHoldingsPage() {
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

  // Test 1: Check cap_table_entries with user_id match
  const { data: byUserId, error: error1 } = await supabase
    .from('cap_table_entries')
    .select('*')
    .eq('user_id', user.id)

  // Test 2: Check cap_table_entries with email match
  const { data: byEmail, error: error2 } = await supabase
    .from('cap_table_entries')
    .select('*')
    .eq('holder_email', profile?.email || '')

  // Test 3: Check with OR query (what dashboard uses)
  const { data: byOr, error: error3 } = await supabase
    .from('cap_table_entries')
    .select('*')
    .or(`user_id.eq.${user.id},holder_email.eq.${profile?.email}`)

  // Test 4: Check all cap_table_entries (to see if any exist)
  const { data: allEntries, error: error4 } = await supabase
    .from('cap_table_entries')
    .select('*')

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Holdings</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">User Info</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({ 
              userId: user.id, 
              email: profile?.email,
              profileId: profile?.id
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Test 1: Cap Table Entries by user_id</h2>
          <p className="text-sm text-gray-600 mb-2">Found: {byUserId?.length || 0} entries</p>
          {error1 && <p className="text-red-600 mb-2">Error: {error1.message}</p>}
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(byUserId, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Test 2: Cap Table Entries by holder_email</h2>
          <p className="text-sm text-gray-600 mb-2">Found: {byEmail?.length || 0} entries</p>
          {error2 && <p className="text-red-600 mb-2">Error: {error2.message}</p>}
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(byEmail, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Test 3: Cap Table Entries with OR query</h2>
          <p className="text-sm text-gray-600 mb-2">Found: {byOr?.length || 0} entries</p>
          {error3 && <p className="text-red-600 mb-2">Error: {error3.message}</p>}
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(byOr, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Test 4: All Cap Table Entries (RLS bypassed if you're admin)</h2>
          <p className="text-sm text-gray-600 mb-2">Found: {allEntries?.length || 0} total entries</p>
          {error4 && <p className="text-red-600 mb-2">Error: {error4.message}</p>}
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(allEntries?.map(e => ({
              id: e.id,
              holder_name: e.holder_name,
              holder_email: e.holder_email,
              user_id: e.user_id,
              shares: e.shares
            })), null, 2)}
          </pre>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">What to check:</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Does Test 4 show any entries with holder_email matching your email?</li>
            <li>Do those entries have user_id set to your userId?</li>
            <li>If user_id is NULL, the auto-linking didn't work</li>
            <li>If Tests 1-3 return 0 but Test 4 shows entries, it's an RLS policy issue</li>
          </ul>
        </div>

        <a href="/dashboard" className="inline-block mt-6 text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </a>
      </div>
    </main>
  )
}
