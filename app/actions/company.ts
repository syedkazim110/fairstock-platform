'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function addBoardMember(companyId: string, email: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' }
    }

    // Check if current user is the company owner
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return { success: false, error: 'Company not found' }
    }

    if (company.owner_id !== user.id) {
      return { success: false, error: 'Only the company owner can add board members' }
    }

    // Look up user by email in auth.users using service role client
    // This bypasses RLS restrictions
    const adminClient = createServiceRoleClient()
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching users:', authError)
      return { success: false, error: 'Failed to verify user. Please try again.' }
    }

    const targetUser = authUsers.users.find(u => u.email === email)

    if (!targetUser) {
      return { success: false, error: 'No user found with this email address. They need to sign up first.' }
    }

    // Check if user is trying to add themselves
    if (targetUser.id === user.id) {
      return { success: false, error: 'You cannot add yourself as a board member' }
    }

    // Check if this user is already a member
    // Use maybeSingle() to handle the case where no record exists
    const { data: existingMember, error: checkError } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', targetUser.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing membership:', checkError)
      // Continue anyway, the insert will catch duplicates
    }

    if (existingMember) {
      return { success: false, error: 'This user is already a member of this company' }
    }

    // Add the board member
    const { error: insertError } = await supabase
      .from('company_members')
      .insert({
        company_id: companyId,
        user_id: targetUser.id,
        role: 'board_member',
        invited_by: user.id,
        status: 'active'
      })

    if (insertError) {
      console.error('Error adding board member:', insertError)
      
      // Handle duplicate key error specifically
      if (insertError.code === '23505') {
        return { success: false, error: 'This user is already a member of this company' }
      }
      
      return { success: false, error: 'Failed to add board member. Please try again.' }
    }

    return { success: true, message: 'Board member added successfully!' }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
