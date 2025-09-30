import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MagicLinkForm from '@/components/auth/MagicLinkForm'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Fairstock Platform
            </h1>
            <p className="text-gray-600">
              Company management and board collaboration
            </p>
          </div>

          <MagicLinkForm />

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              By signing in, you agree to our terms and privacy policy.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            No account? Just enter your email and we&apos;ll send you a magic link to sign in.
          </p>
        </div>
      </div>
    </main>
  )
}
