'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function convertInstrument(
  instrumentId: string,
  roundId: string,
  conversionDetails: {
    shares: number
    pricePerShare: number
    equityType: 'common_stock' | 'preferred_stock'
  }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Get the instrument
    const { data: instrument, error: instrumentError } = await supabase
      .from('convertible_instruments')
      .select('*, company_id')
      .eq('id', instrumentId)
      .single()

    if (instrumentError || !instrument) {
      return { success: false, error: 'Instrument not found' }
    }

    // Check if current user is the company owner
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', instrument.company_id)
      .single()

    if (companyError || !company) {
      return { success: false, error: 'Company not found' }
    }

    if (company.owner_id !== user.id) {
      return { success: false, error: 'Only the company owner can convert instruments' }
    }

    // Check if instrument is already converted
    if (instrument.status !== 'outstanding') {
      return { success: false, error: 'This instrument has already been converted or is not outstanding' }
    }

    // Get the fundraising round
    const { data: round, error: roundError } = await supabase
      .from('fundraising_rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (roundError || !round) {
      return { success: false, error: 'Fundraising round not found' }
    }

    // Start transaction: Update instrument status
    const { error: updateError } = await supabase
      .from('convertible_instruments')
      .update({
        status: 'converted',
        conversion_trigger: `Converted to ${conversionDetails.equityType} in ${round.round_name}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', instrumentId)

    if (updateError) {
      console.error('Error updating instrument:', updateError)
      return { success: false, error: 'Failed to update instrument status' }
    }

    // Create cap table entry for the converted equity
    const { error: capTableError } = await supabase
      .from('cap_table_entries')
      .insert({
        company_id: instrument.company_id,
        holder_name: instrument.investor_name,
        holder_email: instrument.investor_email,
        holder_type: 'investor',
        equity_type: conversionDetails.equityType,
        shares: conversionDetails.shares,
        price_per_share: conversionDetails.pricePerShare,
        total_value: conversionDetails.shares * conversionDetails.pricePerShare,
        issue_date: round.close_date,
        notes: `Converted from ${instrument.instrument_type} (Principal: $${instrument.principal_amount})`,
        created_by: user.id
      })

    if (capTableError) {
      console.error('Error creating cap table entry:', capTableError)
      return { success: false, error: 'Failed to create cap table entry' }
    }

    // Create equity transaction record
    const { error: transactionError } = await supabase
      .from('equity_transactions')
      .insert({
        company_id: instrument.company_id,
        transaction_type: 'conversion',
        transaction_date: round.close_date,
        from_holder: `${instrument.instrument_type} - ${instrument.investor_name}`,
        to_holder: instrument.investor_name,
        equity_type: conversionDetails.equityType,
        shares: conversionDetails.shares,
        price_per_share: conversionDetails.pricePerShare,
        total_amount: conversionDetails.shares * conversionDetails.pricePerShare,
        notes: `Converted ${instrument.instrument_type} (ID: ${instrumentId}) in ${round.round_name}`,
        created_by: user.id
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      // Don't fail the entire operation if transaction logging fails
    }

    return { 
      success: true, 
      message: 'Instrument converted successfully! The equity has been added to the cap table.' 
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

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
