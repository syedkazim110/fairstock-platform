'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addSignaturePageToPdf } from '@/lib/pdf-signature'

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

  // PHASE 6: Get pending signature requests - only fetch needed columns
  const { data: rawSignatures, error } = await supabase
    .from('document_signatures')
    .select(`
      id,
      status,
      created_at,
      document_id,
      documents!inner (
        id,
        title,
        description,
        file_name,
        file_size,
        created_at,
        company_id,
        companies!inner (
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

  // Transform the data to match the expected type structure (single objects instead of arrays)
  const signatures = rawSignatures?.map((sig: any) => ({
    id: sig.id,
    status: sig.status,
    created_at: sig.created_at,
    documents: {
      id: sig.documents.id,
      title: sig.documents.title,
      description: sig.documents.description,
      file_name: sig.documents.file_name,
      file_size: sig.documents.file_size,
      created_at: sig.documents.created_at,
      companies: {
        name: sig.documents.companies.name
      }
    }
  })) || []

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

  // For private buckets, we need to create a signed URL with expiration
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600) // URL expires in 1 hour (3600 seconds)

  if (error) {
    console.error('Error creating signed URL:', error)
    return { error: 'Failed to generate document URL' }
  }

  return { url: data.signedUrl }
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

  // Check if all signatures are now complete
  const { data: allSignatures, error: signaturesError } = await supabase
    .from('document_signatures')
    .select(`
      id,
      status,
      signature_data,
      signed_at,
      profiles!board_member_id (
        full_name,
        email
      )
    `)
    .eq('document_id', signature.document_id)

  console.log('=== SIGNATURE CHECK DEBUG ===')
  console.log('Signatures query error:', signaturesError)
  console.log('All signatures data:', allSignatures)
  console.log('Document file type:', signature.documents.file_type)

  if (allSignatures) {
    const allSigned = allSignatures.every((sig) => sig.status === 'signed')
    console.log('All signed?', allSigned)
    console.log('Total signatures:', allSignatures.length)
    console.log('Signed count:', allSignatures.filter(s => s.status === 'signed').length)
    
    // If all signatures are complete, generate the signed PDF
    if (allSigned && signature.documents.file_type === 'application/pdf') {
      console.log('✅ Starting PDF generation process...')
      console.log('Document ID:', signature.document_id)
      console.log('Document title:', signature.documents.title)
      console.log('Document file_path:', signature.documents.file_path)
      
      try {
        console.log('Step 1: Downloading original PDF...')
        // Download the original PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(signature.documents.file_path)

        console.log('Download result:', { hasData: !!fileData, error: downloadError })
        
        if (downloadError) {
          console.error('❌ CRITICAL: Download failed:', downloadError)
          throw new Error(`Failed to download PDF: ${downloadError.message}`)
        }

        if (!downloadError && fileData) {
          console.log('Step 2: Converting to ArrayBuffer...')
          // Convert blob to ArrayBuffer
          const arrayBuffer = await fileData.arrayBuffer()
          console.log('ArrayBuffer size:', arrayBuffer.byteLength)

          console.log('Step 3: Preparing signature info...')
          // Prepare signature information
          const signatureInfo = allSignatures.map((sig: any) => {
            const profile = Array.isArray(sig.profiles) ? sig.profiles[0] : sig.profiles
            return {
              signerName: profile?.full_name || profile?.email || 'Unknown',
              signerEmail: profile?.email || '',
              signatureData: sig.signature_data || '',
              signedAt: sig.signed_at || new Date().toISOString(),
            }
          })
          console.log('Signature info prepared:', signatureInfo.length, 'signatures')

          console.log('Step 4: Generating signed PDF with signature page...')
          // Generate the signed PDF with signature page
          const signedPdfBytes = await addSignaturePageToPdf(
            arrayBuffer,
            signature.documents.title,
            signatureInfo
          )
          console.log('Step 5: PDF generated, size:', signedPdfBytes.byteLength)

          // Generate filename for signed PDF
          const originalPath = signature.documents.file_path
          const pathParts = originalPath.split('.')
          const signedPath = `${pathParts.slice(0, -1).join('.')}-signed.${pathParts[pathParts.length - 1]}`

          // Upload signed PDF to storage using service role to bypass RLS
          // This is safe because the signature has already been validated and all signers approved
          const { createClient: createServiceClient } = await import('@supabase/supabase-js')
          
          // Debug: Check if service role key is available
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
            throw new Error('Service role key not configured')
          }
          
          const serviceSupabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )

          const { error: uploadError } = await serviceSupabase.storage
            .from('documents')
            .upload(signedPath, signedPdfBytes, {
              contentType: 'application/pdf',
              upsert: true,
            })
          
          if (uploadError) {
            console.error('❌ CRITICAL: Error uploading signed PDF:', uploadError)
            console.error('Upload details:', {
              signedPath,
              hasServiceKey: !!serviceRoleKey,
              bucketName: 'documents',
              uploadErrorMessage: uploadError.message
            })
            throw new Error(`Failed to upload signed PDF: ${uploadError.message}`)
          }

          console.log('✅ Upload successful, updating database...')
          
          if (!uploadError) {
            // Update document record with signed file path AND status using service role
            // We need service role here because board members don't have UPDATE permission on documents table
            const { error: updateError } = await serviceSupabase
              .from('documents')
              .update({ 
                signed_file_path: signedPath,
                status: 'fully_signed'
              })
              .eq('id', signature.document_id)

            if (updateError) {
              console.error('❌ Failed to update document:', updateError)
              throw new Error(`Database update failed: ${updateError.message}`)
            }

            console.log('✅ Document updated with signed PDF path and status set to fully_signed')

            // Create audit log for signed PDF generation
            await supabase.from('document_audit_log').insert({
              document_id: signature.document_id,
              user_id: user.id,
              action: 'uploaded',
              details: {
                action_type: 'signed_pdf_generated',
                message: 'Signed PDF with signature page generated',
              },
              ip_address: null,
              user_agent: null,
            })
          } else {
            console.error('Error uploading signed PDF:', uploadError)
          }
        }
      } catch (pdfError) {
        console.error('❌ CRITICAL ERROR in PDF generation:', pdfError)
        console.error('Error details:', {
          message: pdfError instanceof Error ? pdfError.message : String(pdfError),
          stack: pdfError instanceof Error ? pdfError.stack : undefined,
          documentId: signature.document_id,
          documentTitle: signature.documents.title
        })
        // Don't fail the signature process if PDF generation fails, but log extensively
      }
    } else {
      console.log('Skipping PDF generation:', {
        allSigned,
        fileType: signature.documents.file_type,
        reason: !allSigned ? 'Not all signatures complete' : 'Not a PDF file'
      })
    }
  }

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

  // Delete files from storage (both original and signed if exists)
  const filesToDelete = [document.file_path]
  if (document.signed_file_path) {
    filesToDelete.push(document.signed_file_path)
  }
  await supabase.storage.from('documents').remove(filesToDelete)

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
