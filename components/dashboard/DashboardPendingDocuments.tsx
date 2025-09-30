'use client'

import { useRouter } from 'next/navigation'
import PendingDocuments from '@/components/documents/PendingDocuments'

interface PendingSignature {
  id: string
  status: 'pending' | 'signed' | 'declined'
  created_at: string
  documents: {
    id: string
    title: string
    description: string | null
    file_name: string
    file_size: number
    created_at: string
    companies: {
      name: string
    }
  }
}

interface DashboardPendingDocumentsProps {
  signatures: PendingSignature[]
}

export default function DashboardPendingDocuments({
  signatures,
}: DashboardPendingDocumentsProps) {
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
  }

  return <PendingDocuments signatures={signatures} onRefresh={handleRefresh} />
}
