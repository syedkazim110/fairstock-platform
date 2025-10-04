import { getPendingDocuments } from '@/app/actions/documents'
import DashboardPendingDocuments from '@/components/dashboard/DashboardPendingDocuments'

export async function PendingSignaturesSection() {
  const { signatures: pendingSignatures } = await getPendingDocuments()

  if (!pendingSignatures || pendingSignatures.length === 0) {
    return null
  }

  return (
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Pending Signatures
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Documents waiting for your signature
        </p>
      </div>
      <DashboardPendingDocuments signatures={pendingSignatures} />
    </div>
  )
}
