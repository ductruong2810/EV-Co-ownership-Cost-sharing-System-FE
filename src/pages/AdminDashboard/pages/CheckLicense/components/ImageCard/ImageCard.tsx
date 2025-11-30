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
        {documentInfo.reviewNote && (
          <div className='sm:col-span-2'>
            {infoRow('Last review note', documentInfo.reviewNote)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h5 className='text-gray-800 font-bold text-sm uppercase tracking-wide'>{alt}</h5>
        <StatusBadge status={status} />
      </div>
      <div className='bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200'>
        <div className='flex flex-col lg:flex-row gap-4 lg:items-stretch'>
          <div
            className='relative cursor-pointer rounded-xl overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-all duration-200 lg:w-1/2 group flex-shrink-0'
            onClick={() => setSelected(image)}
          >
            <img
              src={getDecryptedImageUrl(image)}
              alt={alt}
              className='w-full h-48 lg:h-64 object-cover transition-transform duration-300 group-hover:scale-105'
            />
            <span className='absolute bottom-2 right-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm font-medium'>
              Click to enlarge
            </span>
          </div>
          <div className='flex flex-col lg:w-1/2'>
            <div className='flex-1 mb-4'>
              <div className='mb-3'>{renderInfo()}</div>
              {documentInfo?.uploadedAt && (
                <p className='text-xs text-gray-500'>
                  Uploaded: {new Date(documentInfo.uploadedAt).toLocaleString()}
                </p>
              )}
            </div>
            {status === 'PENDING' && (
              <div className='flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200 mt-auto'>
                <button
                  onClick={handleApprove}
                  className='flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2.5 px-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md h-[44px]'
                >
                  <svg className='w-4 h-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                  </svg>
                  <span>Approve</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowRejectModal(true)
                  }}
                  className='flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 px-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md h-[44px]'
                >
                  <svg className='w-4 h-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div
          className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm'
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className='bg-white rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b border-gray-200 pb-3'>
              <h3 className='text-xl font-bold text-gray-800'>Reject {alt}</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className='text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            <p className='text-sm text-gray-600'>
              Please provide a reason so the user knows what to fix.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className='w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all'
              placeholder='Example: Image is blurry / Document expired / Information mismatch...'
            />
            <div className='flex gap-3 justify-end pt-2'>
              <button
                onClick={() => setShowRejectModal(false)}
                className='px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className='px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-md hover:shadow-lg'
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCard
