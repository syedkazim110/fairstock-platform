'use server'

import { createClient } from '@/lib/supabase/server'
import { addSignaturePageToPdf } from '@/lib/pdf-signature'
import { revalidatePath } from 'next/cache'

export async function regenerateSignedPdfs() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  try {
    // Get all documents that are fully signed but missing signed_file_path
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        file_path,
        file_type,
        signed_file_path,
        company_id,
        status,
        companies!inner (
          owner_id
        ),
        document_signatures (
          id,
          status,
          signature_data,
          signed_at,
          profiles!board_member_id (
            full_name,
            email
          )
        )
      `)
      .eq('status', 'fully_signed')
      .is('signed_file_path', null)
      .eq('file_type', 'application/pdf')

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return { error: 'Failed to fetch documents' }
    }

    if (!documents || documents.length === 0) {
      return { success: true, message: 'No documents need regeneration', count: 0 }
    }

    console.log(`Found ${documents.length} documents to regenerate`)

    const results = []
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return { error: 'Service role key not configured' }
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

    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.title} (${doc.id})`)

        // Check if all signatures are actually signed
        const allSigned = doc.document_signatures.every((sig) => sig.status === 'signed')
        if (!allSigned) {
          console.log(`Skipping ${doc.title} - not all signatures are complete`)
          results.push({ id: doc.id, title: doc.title, status: 'skipped', reason: 'Incomplete signatures' })
          continue
        }

        // Download the original PDF
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.file_path)

        if (downloadError || !fileData) {
          console.error(`Failed to download ${doc.title}:`, downloadError)
          results.push({ id: doc.id, title: doc.title, status: 'error', reason: 'Download failed' })
          continue
        }

        // Convert to ArrayBuffer
        const arrayBuffer = await fileData.arrayBuffer()

        // Prepare signature information
        const signatureInfo = doc.document_signatures.map((sig: any) => {
          const profile = Array.isArray(sig.profiles) ? sig.profiles[0] : sig.profiles
          return {
            signerName: profile?.full_name || profile?.email || 'Unknown',
            signerEmail: profile?.email || '',
            signatureData: sig.signature_data || '',
            signedAt: sig.signed_at || new Date().toISOString(),
          }
        })

        // Generate signed PDF
        const signedPdfBytes = await addSignaturePageToPdf(
          arrayBuffer,
          doc.title,
          signatureInfo
        )

        // Generate filename for signed PDF
        const originalPath = doc.file_path
        const pathParts = originalPath.split('.')
        const signedPath = `${pathParts.slice(0, -1).join('.')}-signed.${pathParts[pathParts.length - 1]}`

        // Upload signed PDF using service role
        const { error: uploadError } = await serviceSupabase.storage
          .from('documents')
          .upload(signedPath, signedPdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadError) {
          console.error(`Failed to upload signed PDF for ${doc.title}:`, uploadError)
          results.push({ id: doc.id, title: doc.title, status: 'error', reason: 'Upload failed' })
          continue
        }

        // Update document with signed_file_path
        const { error: updateError } = await supabase
          .from('documents')
          .update({ signed_file_path: signedPath })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`Failed to update document ${doc.title}:`, updateError)
          results.push({ id: doc.id, title: doc.title, status: 'error', reason: 'Update failed' })
          continue
        }

        // Create audit log
        await supabase.from('document_audit_log').insert({
          document_id: doc.id,
          user_id: user.id,
          action: 'uploaded',
          details: {
            action_type: 'signed_pdf_regenerated',
            message: 'Signed PDF regenerated from existing signatures',
          },
          ip_address: null,
          user_agent: null,
        })

        console.log(`✅ Successfully regenerated signed PDF for ${doc.title}`)
        results.push({ id: doc.id, title: doc.title, status: 'success' })

      } catch (error) {
        console.error(`Error processing document ${doc.title}:`, error)
        results.push({ id: doc.id, title: doc.title, status: 'error', reason: String(error) })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    // Revalidate all company document pages to show the new signed PDFs
    const companyIds = new Set(documents.map(doc => doc.company_id))
    companyIds.forEach(companyId => {
      revalidatePath(`/company/${companyId}/documents`)
    })
    revalidatePath('/dashboard')

    return { 
      success: true, 
      message: `Regenerated ${successCount} signed PDFs (${errorCount} errors)`,
      count: successCount,
      results 
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
