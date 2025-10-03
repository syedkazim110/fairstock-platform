import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface SignatureInfo {
  signerName: string
  signerEmail: string
  signatureData: string // base64 image
  signedAt: string
}

export async function addSignaturePageToPdf(
  originalPdfBuffer: ArrayBuffer,
  documentTitle: string,
  signatures: SignatureInfo[]
): Promise<Uint8Array> {
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBuffer)
  
  // Add a new page for signatures
  const signaturePage = pdfDoc.addPage()
  const { width, height } = signaturePage.getSize()
  
  // Load fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  // Title section
  const titleFontSize = 18
  const sectionFontSize = 14
  const textFontSize = 10
  
  let yPosition = height - 60
  
  // Document title
  signaturePage.drawText('Document Signatures', {
    x: 50,
    y: yPosition,
    size: titleFontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  
  yPosition -= 30
  
  // Document name
  signaturePage.drawText(`Document: ${documentTitle}`, {
    x: 50,
    y: yPosition,
    size: textFontSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  })
  
  yPosition -= 20
  
  // Completion date
  const completionDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
  
  signaturePage.drawText(`Completed: ${completionDate}`, {
    x: 50,
    y: yPosition,
    size: textFontSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  })
  
  yPosition -= 40
  
  // Draw a separator line
  signaturePage.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  })
  
  yPosition -= 30
  
  // Signatures section
  signaturePage.drawText('Electronic Signatures:', {
    x: 50,
    y: yPosition,
    size: sectionFontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  
  yPosition -= 30
  
  // Add each signature
  for (const signature of signatures) {
    // Check if we need a new page
    if (yPosition < 150) {
      const newPage = pdfDoc.addPage()
      yPosition = newPage.getSize().height - 60
    }
    
    // Signer name
    signaturePage.drawText(signature.signerName, {
      x: 50,
      y: yPosition,
      size: textFontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    })
    
    yPosition -= 15
    
    // Signer email
    signaturePage.drawText(signature.signerEmail, {
      x: 50,
      y: yPosition,
      size: textFontSize,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    yPosition -= 20
    
    // Embed and draw signature image
    try {
      // Extract base64 data (remove data:image/png;base64, prefix if present)
      const base64Data = signature.signatureData.split(',')[1] || signature.signatureData
      
      // Convert base64 to bytes
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      
      // Embed the PNG image
      const signatureImage = await pdfDoc.embedPng(imageBytes)
      
      // Calculate dimensions (maintain aspect ratio, max width 200px)
      const maxWidth = 200
      const maxHeight = 60
      const imgDims = signatureImage.scale(1)
      
      let imgWidth = imgDims.width
      let imgHeight = imgDims.height
      
      if (imgWidth > maxWidth) {
        const scale = maxWidth / imgWidth
        imgWidth = maxWidth
        imgHeight = imgHeight * scale
      }
      
      if (imgHeight > maxHeight) {
        const scale = maxHeight / imgHeight
        imgHeight = maxHeight
        imgWidth = imgWidth * scale
      }
      
      // Draw signature image
      signaturePage.drawImage(signatureImage, {
        x: 50,
        y: yPosition - imgHeight,
        width: imgWidth,
        height: imgHeight,
      })
      
      yPosition -= imgHeight + 10
    } catch (error) {
      console.error('Error embedding signature image:', error)
      // If image fails, just show text
      signaturePage.drawText('[Signature image unavailable]', {
        x: 50,
        y: yPosition,
        size: textFontSize,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= 20
    }
    
    // Signing date
    const signedDate = new Date(signature.signedAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    
    signaturePage.drawText(`Signed on: ${signedDate}`, {
      x: 50,
      y: yPosition,
      size: textFontSize,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    yPosition -= 35
    
    // Draw separator between signatures
    if (signatures.indexOf(signature) < signatures.length - 1) {
      signaturePage.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })
      yPosition -= 25
    }
  }
  
  // Add footer
  const footerY = 30
  signaturePage.drawText('This document has been electronically signed and is legally binding.', {
    x: 50,
    y: footerY,
    size: 8,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  })
  
  // Save and return the modified PDF
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
