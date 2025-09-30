'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase with a timeout
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 3000)
      )
    ])
  } catch (error) {
    console.error('Sign out error:', error)
    // Continue even if sign out fails
  }
  
  // Clear Supabase cookies manually as a fallback
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Remove all Supabase auth cookies
  allCookies.forEach(cookie => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      cookieStore.delete(cookie.name)
    }
  })
  
  // Revalidate and redirect
  revalidatePath('/', 'layout')
  redirect('/')
}
