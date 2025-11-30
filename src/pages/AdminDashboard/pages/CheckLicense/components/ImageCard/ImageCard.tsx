import { useState, type FC } from 'react'
import { toast } from 'react-toastify'
import staffApi from '../../../../../../apis/staff.api'
import auditApi from '../../../../../../apis/audit.api'
import { getDecryptedImageUrl } from '../../../../../../utils/imageUrl'
import type { DocumentInfo } from '../../../../../../types/api/staff.type'
import type { Status } from '../../CheckLicense'
import StatusBadge from '../StatusBadge'

interface ImageCardProps {
  image: string
  alt: string
  status: Status
  onApprove: () => void
  onReject: () => void
  documentId?: number
  setSelected: (image: string) => void
  documentInfo?: DocumentInfo | null
}

const ImageCard: FC<ImageCardProps> = ({
  image,
  alt,
  status,
  onApprove,
  onReject,
  documentId,
  setSelected,
  documentInfo
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!documentId) return
    const confirmed = window.confirm(
      'Approve this document?\n• Ensure the image is clear\n• OCR information matches the document\n• Document is valid and not expired'
    )
    if (!confirmed) return
    await staffApi.reviewDocument(documentId, 'APPROVE')
    toast.success('Document approved successfully', { autoClose: 2000 })
    auditApi
      .logAction({
        type: 'DOCUMENT_REVIEW',
        entityId: documentId,
        entityType: 'DOCUMENT',
        message: `Approved ${alt}`
      })
      .catch(() => undefined)
    onApprove()
  }

  const handleRejectSubmit = async () => {
    if (!documentId) return
    if (!rejectReason.trim()) {
      toast.warning('Please provide a rejection note', { autoClose: 2000 })
      return
    }
    await staffApi.reviewDocument(documentId, 'REJECT', rejectReason.trim())
    toast.success('Document rejected', { autoClose: 2000 })
    auditApi
      .logAction({
        type: 'DOCUMENT_REVIEW',
        entityId: documentId,
        entityType: 'DOCUMENT',
        message: `Rejected ${alt}`,
        metadata: { reason: rejectReason.trim() }
      })
      .catch(() => undefined)
    onReject()
    setRejectReason('')
    setShowRejectModal(false)
  }

  const infoRow = (label: string, value?: string | null) =>
    value ? (
      <div className='flex flex-col'>
        <span className='text-[11px] font-semibold text-gray-500 uppercase'>{label}</span>
        <span className='text-sm text-gray-900 break-words'>{value}</span>
      </div>
    ) : null

  const renderInfo = () => {
    if (!documentInfo) {
      return (
        <p className='text-xs text-gray-500 italic'>
          No OCR data available. Please rely on the image for verification.
        </p>
      )
    }

    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
        {infoRow('Document #', documentInfo.documentNumber)}
        {infoRow('Date of Birth', documentInfo.dateOfBirth)}
        {infoRow('Issue Date', documentInfo.issueDate)}
        {infoRow('Expiry Date', documentInfo.expiryDate)}
        {infoRow('Address', documentInfo.address)}
        {documentInfo.reviewNote && infoRow('Last review note', documentInfo.reviewNote)}
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <h5 className='text-gray-700 font-bold text-sm'>{alt}</h5>
        <StatusBadge status={status} />
      </div>
      <div className='bg-white border border-gray-200 rounded-xl p-4 shadow-sm'>
        <div className='flex flex-col lg:flex-row gap-4'>
          <div
            className='relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-400 transition-all lg:w-1/2'
            onClick={() => setSelected(image)}
          >
            <img
              src={getDecryptedImageUrl(image)}
              alt={alt}
              className='w-full h-48 object-cover transition-transform duration-300 hover:scale-105'
            />
            <span className='absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full'>
              Click to enlarge
            </span>
          </div>
          <div className='flex flex-col gap-3 lg:w-1/2'>
            <div>{renderInfo()}</div>
            {documentInfo?.uploadedAt && (
              <p className='text-xs text-gray-500'>
                Uploaded: {new Date(documentInfo.uploadedAt).toLocaleString()}
              </p>
            )}
            {status === 'PENDING' && (
              <div className='flex flex-col sm:flex-row gap-2 mt-auto'>
                <button
                  onClick={handleApprove}
                  className='flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 font-bold transition-colors flex items-center justify-center gap-2'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowRejectModal(true)
                  }}
                  className='flex-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg py-2 font-bold transition-colors flex items-center justify-center gap-2'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div
          className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4'
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className='bg-white rounded-xl max-w-md w-full p-5 space-y-4'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-bold text-gray-800'>Reject {alt}</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                ✕
              </button>
            </div>
            <p className='text-sm text-gray-600'>
              Please provide a reason so the user knows what to fix.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className='w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400'
              placeholder='Example: Image is blurry / Document expired / Information mismatch...'
            />
            <div className='flex gap-2 justify-end'>
              <button
                onClick={() => setShowRejectModal(false)}
                className='px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className='px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600'
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCard
