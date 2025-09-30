'use client'

import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { signDocument } from '@/app/actions/documents'

interface SignatureModalProps {
  signatureId: string
  documentTitle: string
  onClose: () => void
  onSuccess: () => void
}

export default function SignatureModal({
  signatureId,
  documentTitle,
  onClose,
  onSuccess,
}: SignatureModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearSignature = () => {
    sigCanvas.current?.clear()
  }

  const handleSign = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setError('Please provide your signature')
      return
    }

    setIsSigning(true)
    setError(null)

    try {
      // Get signature as base64 data URL
      const signatureData = sigCanvas.current.toDataURL()

      const result = await signDocument(signatureId, signatureData)

      if (result.error) {
        setError(result.error)
        setIsSigning(false)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError('Failed to save signature')
      setIsSigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">Sign Document</h2>
          <p className="text-gray-600 mb-6">{documentTitle}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draw your signature below
            </label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-48 cursor-crosshair',
                  style: { touchAction: 'none' },
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            <button
              onClick={clearSignature}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              type="button"
            >
              Clear Signature
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-sm mb-2">Legal Notice</h3>
            <p className="text-xs text-gray-600">
              By signing this document electronically, you agree that your electronic signature
              is the legal equivalent of your manual signature. You consent to be legally bound
              by the terms of this document.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSigning}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSign}
              disabled={isSigning}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isSigning ? 'Signing...' : 'Sign Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
