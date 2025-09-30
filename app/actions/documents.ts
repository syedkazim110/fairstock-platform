'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const companyId = formData.get('companyId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const file = formData.get('file') as File
  const requiresSignature = formData.get('requiresSignature') === 'true'
  const boardMemberIds = JSON.parse(formData.get('boardMemberIds') as string) as string[]

  if (!companyId || !title || !file) {
    return { error: 'Missing required fields' }
  }

  if (requiresSignature && !boardMemberIds.length) {
    return { error: 'Please select board members for signature' }
  }

  // Verify user is the company owner
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { error: 'Not authorized to upload documents for this company' }
  }

  try {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${companyId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { error: 'Failed to upload file' }
    }

    // Create document record
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        company_id: companyId,
        title,
        description: description || null,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        status: requiresSignature ? 'pending' : 'fully_signed',
        requires_all_signatures: requiresSignature,
      })
      .select()
      .single()

    if (documentError) {
      console.error('Document creation error:', documentError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath])
      return { error: 'Failed to create document record' }
    }

    // Create signature requests only if document requires signatures
    if (requiresSignature && boardMemberIds.length > 0) {
      const signatureRequests = boardMemberIds.map((boardMemberId) => ({
        document_id: document.id,
        board_member_id: boardMemberId,
        company_id: companyId,
        status: 'pending' as const,
      }))

      const { error: signaturesError } = await supabase
        .from('document_signatures')
        .insert(signatureRequests)

      if (signaturesError) {
        console.error('Signature requests error:', signaturesError)
        return { error: 'Failed to create signature requests' }
      }
    }

    // Create audit log entry
    await supabase.from('document_audit_log').insert({
      document_id: document.id,
      user_id: user.id,
      action: 'uploaded',
      details: {
        title,
        file_name: file.name,
        requires_signature: requiresSignature,
        board_members_count: requiresSignature ? boardMemberIds.length : 0,
      },
      ip_address: null,
      user_agent: null,
    })

    revalidatePath(`/company/${companyId}/documents`)
    return { success: true, documentId: document.id }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getCompanyDocuments(companyId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get documents with signature counts
  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_signatures (
        id,
        status,
        board_member_id,
        signed_at,
        profiles!board_member_id (
          full_name,
          email
        )
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return { error: 'Failed to fetch documents' }
  }

  return { documents }
}

export async function getPendingDocuments() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get pending signature requests for the current user
  const { data: signatures, error } = await supabase
    .from('document_signatures')
    .select(`
      *,
      documents (
        *,
        companies (
          name
        )
      )
    `)
    .eq('board_member_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending documents:', error)
    return { error: 'Failed to fetch pending documents' }
  }

  return { signatures }
}

export async function getDocumentUrl(filePath: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath)

  return { url: data.publicUrl }
}

export async function signDocument(signatureId: string, signatureData: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify this signature request belongs to the current user
  const { data: signature } = await supabase
    .from('document_signatures')
    .select('*, documents(*)')
    .eq('id', signatureId)
    .eq('board_member_id', user.id)
    .single()

  if (!signature) {
    return { error: 'Signature request not found or not authorized' }
  }

  if (signature.status !== 'pending') {
    return { error: 'Document has already been signed or declined' }
  }

  // Update signature with signature data
  const { error: updateError } = await supabase
    .from('document_signatures')
    .update({
      status: 'signed',
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    })
    .eq('id', signatureId)

  if (updateError) {
    console.error('Error updating signature:', updateError)
    return { error: 'Failed to save signature' }
  }

  // Create audit log entry
  await supabase.from('document_audit_log').insert({
    document_id: signature.document_id,
    user_id: user.id,
    action: 'signed',
    details: {
      signature_id: signatureId,
    },
    ip_address: null,
    user_agent: null,
  })

  revalidatePath(`/company/${signature.company_id}/documents`)
  revalidatePath('/dashboard')
  
  return { success: true }
}

export async function declineDocument(signatureId: string, reason: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify this signature request belongs to the current user
  const { data: signature } = await supabase
    .from('document_signatures')
    .select('*, documents(*)')
    .eq('id', signatureId)
    .eq('board_member_id', user.id)
    .single()

  if (!signature) {
    return { error: 'Signature request not found or not authorized' }
  }

  if (signature.status !== 'pending') {
    return { error: 'Document has already been signed or declined' }
  }

  // Update signature status to declined
  const { error: updateError } = await supabase
    .from('document_signatures')
    .update({
      status: 'declined',
      decline_reason: reason,
      declined_at: new Date().toISOString(),
    })
    .eq('id', signatureId)

  if (updateError) {
    console.error('Error declining document:', updateError)
    return { error: 'Failed to decline document' }
  }

  // Create audit log entry
  await supabase.from('document_audit_log').insert({
    document_id: signature.document_id,
    user_id: user.id,
    action: 'declined',
    details: {
      signature_id: signatureId,
      reason,
    },
    ip_address: null,
    user_agent: null,
  })

  revalidatePath(`/company/${signature.company_id}/documents`)
  revalidatePath('/dashboard')
  
  return { success: true }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get document and verify ownership
  const { data: document } = await supabase
    .from('documents')
    .select('*, companies(owner_id)')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { error: 'Document not found' }
  }

  if (document.companies?.owner_id !== user.id) {
    return { error: 'Not authorized to delete this document' }
  }

  // Delete file from storage
  await supabase.storage.from('documents').remove([document.file_path])

  // Delete document (cascade will handle signatures and audit logs)
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    console.error('Error deleting document:', deleteError)
    return { error: 'Failed to delete document' }
  }

  revalidatePath(`/company/${document.company_id}/documents`)
  
  return { success: true }
}
