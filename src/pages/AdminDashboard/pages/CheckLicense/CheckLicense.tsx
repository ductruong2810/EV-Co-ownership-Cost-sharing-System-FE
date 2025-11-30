/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Input, Select, Tag, Checkbox, Button, Space, Modal, message } from 'antd'
import { SearchOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { toast } from 'react-toastify'
import staffApi from '../../../../apis/staff.api'
import { getDecryptedImageUrl } from '../../../../utils/imageUrl'
import Skeleton from '../../../../components/Skeleton'
import ImageCardComponent from './components/ImageCard/ImageCard'
import EmptyState from '../EmptyState'
import StatusBadge from './components/StatusBadge'
import type { DocumentInfo, UserDetails } from '../../../../types/api/staff.type'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const { Option } = Select

export type Status = 'PENDING' | 'APPROVED' | 'REJECTED'
type DocType = 'cccd' | 'gplx'
type Side = 'front' | 'back'

interface Document {
  frontImage: string
  backImage: string
  frontStatus: Status
  backStatus: Status
  frontId?: number
  backId?: number
  frontInfo?: DocumentInfo | null
  backInfo?: DocumentInfo | null
}

interface Member {
  id: string
  name: string
  email: string
  phone: string
  cccd: Document
  gplx: Document
}

const DOC_CONFIG = {
  cccd: { title: 'Citizen ID card', shortTitle: 'CCCD', accent: '#3B82F6' },
  gplx: { title: 'Driver license', shortTitle: 'DL', accent: '#10B981' }
}

function mapUserToMember(user: any): Member {
  const defaultImage = 'https://tailwindflex.com/storage/thumbnails/skeleton-loader/thumb_u.min.webp?v=1'

  return {
    id: String(user.userId || ''),
    name: user.fullName || '',
    email: user.email || '',
    phone: user.phoneNumber || '',
    cccd: {
      frontImage: user.documents?.citizenIdImages?.front?.imageUrl || defaultImage,
      backImage: user.documents?.citizenIdImages?.back?.imageUrl || defaultImage,
      frontStatus: user.documents?.citizenIdImages?.front?.status || 'PENDING',
      backStatus: user.documents?.citizenIdImages?.back?.status || 'PENDING',
      frontId: user.documents?.citizenIdImages?.front?.documentId,
      backId: user.documents?.citizenIdImages?.back?.documentId,
      frontInfo: user.documents?.citizenIdImages?.front || null,
      backInfo: user.documents?.citizenIdImages?.back || null
    },
    gplx: {
      frontImage: user.documents?.driverLicenseImages?.front?.imageUrl || defaultImage,
      backImage: user.documents?.driverLicenseImages?.back?.imageUrl || defaultImage,
      frontStatus: user.documents?.driverLicenseImages?.front?.status || 'PENDING',
      backStatus: user.documents?.driverLicenseImages?.back?.status || 'PENDING',
      frontId: user.documents?.driverLicenseImages?.front?.documentId,
      backId: user.documents?.driverLicenseImages?.back?.documentId,
      frontInfo: user.documents?.driverLicenseImages?.front || null,
      backInfo: user.documents?.driverLicenseImages?.back || null
    }
  }
}

export default function CheckLicense() {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<UserDetails | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  const queryClient = useQueryClient()

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const promises = documentIds.map((id) => staffApi.reviewDocument(id, 'APPROVE'))
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(`Successfully approved ${selectedDocuments.size} document(s)`)
      setSelectedDocuments(new Set())
      setShowBulkActions(false)
      // Reload data
      setLoading(true)
      staffApi
        .getUsersPendingLicense()
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            setMembers(res.data.map(mapUserToMember))
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    },
    onError: () => {
      message.error('Failed to approve some documents. Please try again.')
    }
  })

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ documentIds, reason }: { documentIds: number[]; reason: string }) => {
      const promises = documentIds.map((id) => staffApi.reviewDocument(id, 'REJECT', reason))
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(`Successfully rejected ${selectedDocuments.size} document(s)`)
      setSelectedDocuments(new Set())
      setShowBulkActions(false)
      // Reload data
      setLoading(true)
      staffApi
        .getUsersPendingLicense()
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            setMembers(res.data.map(mapUserToMember))
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    },
    onError: () => {
      message.error('Failed to reject some documents. Please try again.')
    }
  })

  // Helper to get all pending document IDs from selected members
  const getPendingDocumentIds = (): number[] => {
    const ids: number[] = []
    filteredMembers.forEach((member) => {
      if (selectedDocuments.has(member.id)) {
        if (member.cccd.frontStatus === 'PENDING' && member.cccd.frontId) {
          ids.push(member.cccd.frontId)
        }
        if (member.cccd.backStatus === 'PENDING' && member.cccd.backId) {
          ids.push(member.cccd.backId)
        }
        if (member.gplx.frontStatus === 'PENDING' && member.gplx.frontId) {
          ids.push(member.gplx.frontId)
        }
        if (member.gplx.backStatus === 'PENDING' && member.gplx.backId) {
          ids.push(member.gplx.backId)
        }
      }
    })
    return ids
  }

  const handleSelectMember = (memberId: string, checked: boolean) => {
    const newSelected = new Set(selectedDocuments)
    if (checked) {
      newSelected.add(memberId)
    } else {
      newSelected.delete(memberId)
    }
    setSelectedDocuments(newSelected)
    const pendingIds = getPendingDocumentIds()
    setShowBulkActions(newSelected.size > 0 && pendingIds.length > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredMembers.map((m) => m.id))
      setSelectedDocuments(allIds)
      const pendingIds = getPendingDocumentIds()
      setShowBulkActions(pendingIds.length > 0)
    } else {
      setSelectedDocuments(new Set())
      setShowBulkActions(false)
    }
  }

  const handleBulkApprove = () => {
    const pendingIds = getPendingDocumentIds()
    if (pendingIds.length === 0) {
      message.warning('No pending documents selected')
      return
    }
    Modal.confirm({
      title: 'Approve Selected Documents',
      content: `Are you sure you want to approve ${pendingIds.length} pending document(s)?`,
      onOk: () => {
        bulkApproveMutation.mutate(pendingIds)
      }
    })
  }

  const handleBulkReject = () => {
    const pendingIds = getPendingDocumentIds()
    if (pendingIds.length === 0) {
      message.warning('No pending documents selected')
      return
    }
    Modal.confirm({
      title: 'Reject Selected Documents',
      content: (
        <div className='mt-4'>
          <p className='mb-2'>Please provide a reason for rejecting {pendingIds.length} document(s):</p>
          <Input.TextArea
            id='bulk-rejection-reason'
            rows={3}
            placeholder='Enter rejection reason...'
            required
          />
        </div>
      ),
      okText: 'Reject',
      okButtonProps: { danger: true },
      onOk: (close) => {
        const reasonInput = document.getElementById('bulk-rejection-reason') as HTMLTextAreaElement
        const reason = reasonInput?.value?.trim()
        if (!reason) {
          message.error('Rejection reason is required')
          return Promise.reject()
        }
        bulkRejectMutation.mutate({ documentIds: pendingIds, reason })
        close()
      }
    })
  }

  useEffect(() => {
    setLoading(true)
    staffApi
      .getUsersPendingLicense()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setMembers(res.data.map(mapUserToMember))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleViewDetail = async (userId: string) => {
    setLoadingDetail(true)
    try {
      const response = await staffApi.getUserDetailInStaffById(userId)
      setDetailData(response.data)
    } catch (error) {
      console.error('Error fetching user details:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const updateStatus = async (id: string, type: DocType, side: Side, status: Status) => {
    // Update local state immediately for better UX
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, [type]: { ...x[type], [`${side}Status`]: status } } : x)))
    
    // Reload data from server to ensure consistency
    setLoading(true)
    try {
      const res = await staffApi.getUsersPendingLicense()
      if (res.data && Array.isArray(res.data)) {
        setMembers(res.data.map(mapUserToMember))
      }
    } catch (error) {
      console.error('Error reloading data:', error)
      message.error('Failed to reload data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const approveBothSides = async (memberId: string, docType: DocType) => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return

    const doc = member[docType]
    const frontId = doc.frontId
    const backId = doc.backId
    const bothPending = doc.frontStatus === 'PENDING' && doc.backStatus === 'PENDING'

    if (!bothPending) {
      message.warning('Both sides must be pending to approve together')
      return
    }

    if (!frontId || !backId) {
      message.error('Document IDs not found')
      return
    }

    const confirmed = window.confirm(
      `Approve both sides of ${docType.toUpperCase()}?\n• Front and back sides will be approved together\n• Ensure both images are clear and valid`
    )

    if (!confirmed) return

    try {
      await Promise.all([
        staffApi.reviewDocument(frontId, 'APPROVE'),
        staffApi.reviewDocument(backId, 'APPROVE')
      ])
      
      toast.success('Both sides approved successfully', { autoClose: 2000 })
      
      // Update local state
      setMembers((m) =>
        m.map((x) =>
          x.id === memberId
            ? {
                ...x,
                [docType]: {
                  ...x[docType],
                  frontStatus: 'APPROVED',
                  backStatus: 'APPROVED'
                }
              }
            : x
        )
      )

      // Reload data
      setLoading(true)
      staffApi
        .getUsersPendingLicense()
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            setMembers(res.data.map(mapUserToMember))
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } catch (error) {
      message.error('Failed to approve both sides. Please try again.')
      console.error(error)
    }
  }

  const rejectBothSides = async (memberId: string, docType: DocType) => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return

    const doc = member[docType]
    const frontId = doc.frontId
    const backId = doc.backId
    const bothPending = doc.frontStatus === 'PENDING' && doc.backStatus === 'PENDING'

    if (!bothPending) {
      message.warning('Both sides must be pending to reject together')
      return
    }

    if (!frontId || !backId) {
      message.error('Document IDs not found')
      return
    }

    Modal.confirm({
      title: `Reject Both Sides of ${docType.toUpperCase()}`,
      content: (
        <div className='mt-4'>
          <p className='mb-2'>Please provide a reason for rejecting both sides:</p>
          <Input.TextArea
            id='both-sides-rejection-reason'
            rows={4}
            placeholder='Enter rejection reason...'
            required
          />
        </div>
      ),
      okText: 'Reject Both',
      okButtonProps: { danger: true },
      onOk: async (close) => {
        const reasonInput = document.getElementById('both-sides-rejection-reason') as HTMLTextAreaElement
        const reason = reasonInput?.value?.trim()
        if (!reason) {
          message.error('Rejection reason is required')
          return Promise.reject()
        }

        try {
          await Promise.all([
            staffApi.reviewDocument(frontId, 'REJECT', reason),
            staffApi.reviewDocument(backId, 'REJECT', reason)
          ])

          toast.success('Both sides rejected', { autoClose: 2000 })

          // Update local state
          setMembers((m) =>
            m.map((x) =>
              x.id === memberId
                ? {
                    ...x,
                    [docType]: {
                      ...x[docType],
                      frontStatus: 'REJECTED',
                      backStatus: 'REJECTED'
                    }
                  }
                : x
            )
          )

          // Reload data
          setLoading(true)
          staffApi
            .getUsersPendingLicense()
            .then((res) => {
              if (res.data && Array.isArray(res.data)) {
                setMembers(res.data.map(mapUserToMember))
              }
            })
            .catch(console.error)
            .finally(() => setLoading(false))

          close()
        } catch (error) {
          message.error('Failed to reject both sides. Please try again.')
          console.error(error)
          return Promise.reject()
        }
      }
    })
  }

  // Filter and search logic
  const filteredMembers = useMemo(() => {
    let filtered = members

    // Search by name, email, or phone
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower) ||
          member.phone.toLowerCase().includes(searchLower)
      )
    }

    // Filter by document status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((member) => {
        if (statusFilter === 'PENDING') {
          return (
            member.cccd.frontStatus === 'PENDING' ||
            member.cccd.backStatus === 'PENDING' ||
            member.gplx.frontStatus === 'PENDING' ||
            member.gplx.backStatus === 'PENDING'
          )
        }
        // For APPROVED or REJECTED, check if any document has that status
        return (
          member.cccd.frontStatus === statusFilter ||
          member.cccd.backStatus === statusFilter ||
          member.gplx.frontStatus === statusFilter ||
          member.gplx.backStatus === statusFilter
        )
      })
    }

    return filtered
  }, [members, searchTerm, statusFilter])

  const ImageCardAny = ImageCardComponent as ComponentType<any>

  const SummaryCard = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
    <div className={`rounded-2xl border-2 px-6 py-5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm bg-white/90 ${accent}`}>
      <p className='text-[11px] uppercase tracking-wider text-gray-600 font-bold mb-3 flex items-center gap-2'>
        <span className='w-2 h-2 rounded-full bg-current opacity-60' />
        {label}
      </p>
      <p className='text-4xl font-extrabold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent'>{value.toLocaleString()}</p>
    </div>
  )

  const DocumentSection = ({
    member,
    docType,
    onPreview,
    onUpdateStatus
  }: {
    member: Member
    docType: DocType
    onPreview: (image: string) => void
    onUpdateStatus: (memberId: string, docType: DocType, side: Side, status: Status) => void
  }) => {
    const doc = member[docType]
    const { title, shortTitle, accent } = DOC_CONFIG[docType]
    const bothPending = doc.frontStatus === 'PENDING' && doc.backStatus === 'PENDING'

    return (
      <div className='bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden'>
        <div className='px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-200/50 flex items-center justify-between'>
          <div className='flex items-center'>
            <span
              className='text-xs font-extrabold uppercase px-4 py-1.5 rounded-full text-white shadow-lg'
              style={{ backgroundColor: accent }}
            >
              {shortTitle}
            </span>
            <span className='text-sm font-bold text-gray-800 ml-3 break-words'>{title}</span>
          </div>
          {bothPending && (
            <div className='flex items-center gap-2'>
              <button
                onClick={() => approveBothSides(member.id, docType)}
                className='px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg hover:scale-105'
                title='Approve both sides'
              >
                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                </svg>
                Approve Both
              </button>
              <button
                onClick={() => rejectBothSides(member.id, docType)}
                className='px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg hover:scale-105'
                title='Reject both sides'
              >
                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                </svg>
                Reject Both
              </button>
            </div>
          )}
        </div>
        <div className='p-5 space-y-5 min-w-0'>
          <ImageCardAny
            image={doc.frontImage}
            alt='Front side'
            status={doc.frontStatus}
            documentId={doc.frontId}
            setSelected={onPreview}
            onApprove={() => onUpdateStatus(member.id, docType, 'front', 'APPROVED')}
            onReject={() => onUpdateStatus(member.id, docType, 'front', 'REJECTED')}
            documentInfo={doc.frontInfo}
            hideActions={bothPending}
          />
          <ImageCardAny
            image={doc.backImage}
            alt='Back side'
            status={doc.backStatus}
            documentId={doc.backId}
            setSelected={onPreview}
            onApprove={() => onUpdateStatus(member.id, docType, 'back', 'APPROVED')}
            onReject={() => onUpdateStatus(member.id, docType, 'back', 'REJECTED')}
            documentInfo={doc.backInfo}
            hideActions={bothPending}
          />
        </div>
      </div>
    )
  }

  const DocumentDetailCard = ({ doc, title }: { doc: DocumentInfo | null; title: string }) => {
    if (!doc) {
      return (
        <div className='bg-gray-50 rounded-lg p-4 text-center'>
          <p className='text-sm text-gray-500'>No {title} data</p>
        </div>
      )
    }

    return (
      <div className='bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow'>
        <div className='bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200'>
          <h4 className='text-sm font-bold text-gray-800'>{title}</h4>
        </div>
        <div className='p-4 space-y-3'>
          {/* OCR Extracted Information Section */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3'>
            <div className='flex items-center gap-2 mb-2'>
              <svg className='w-4 h-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              <span className='text-xs font-bold text-blue-900 uppercase'>OCR Extracted Information</span>
            </div>
            <div className='grid grid-cols-2 gap-2 text-xs'>
              {doc.documentNumber && (
                <div>
                  <span className='text-blue-700 font-semibold'>Document #:</span>
                  <p className='text-gray-900 mt-0.5 font-mono'>{doc.documentNumber}</p>
                </div>
              )}
              {doc.dateOfBirth && (
                <div>
                  <span className='text-blue-700 font-semibold'>Date of Birth:</span>
                  <p className='text-gray-900 mt-0.5'>{doc.dateOfBirth}</p>
                </div>
              )}
              {doc.issueDate && (
                <div>
                  <span className='text-blue-700 font-semibold'>Issue Date:</span>
                  <p className='text-gray-900 mt-0.5'>{doc.issueDate}</p>
                </div>
              )}
              {doc.expiryDate && (
                <div>
                  <span className='text-blue-700 font-semibold'>Expiry Date:</span>
                  <p
                    className={`mt-0.5 ${doc.expiryDate && new Date(doc.expiryDate) < new Date() ? 'text-red-600 font-bold' : 'text-gray-900'}`}
                  >
                    {doc.expiryDate}
                    {doc.expiryDate && new Date(doc.expiryDate) < new Date() && ' (EXPIRED)'}
                  </p>
                </div>
              )}
            </div>
            <p className='text-xs text-blue-600 mt-2 italic'>⚠️ Verify this information matches the document image</p>
          </div>

          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div>
              <span className='text-gray-600 font-medium'>Document ID:</span>
              <p className='text-gray-900 mt-1'>{doc.documentId}</p>
            </div>
            <div>
              <span className='text-gray-600 font-medium'>Status:</span>
              <p className='mt-1'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    doc.status === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : doc.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {doc.status}
                </span>
              </p>
            </div>
            {doc.reviewedBy && (
              <div className='col-span-2'>
                <span className='text-gray-600 font-medium'>Reviewed By:</span>
                <p className='text-gray-900 mt-1'>{doc.reviewedBy}</p>
              </div>
            )}
          </div>
          {doc.reviewNote && (
            <div className='pt-3 border-t border-gray-200'>
              <span className='text-gray-600 font-medium text-sm'>Review Note:</span>
              <p className='text-gray-900 mt-1 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200'>
                {doc.reviewNote}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const summary = useMemo(() => {
    const pending = members.filter((m) =>
      ['PENDING'].some(
        (status) =>
          m.cccd.frontStatus === status ||
          m.cccd.backStatus === status ||
          m.gplx.frontStatus === status ||
          m.gplx.backStatus === status
      )
    ).length
    const approved = members.filter((m) =>
      ['APPROVED'].every(
        (status) =>
          m.cccd.frontStatus === status &&
          m.cccd.backStatus === status &&
          m.gplx.frontStatus === status &&
          m.gplx.backStatus === status
      )
    ).length
    const rejected = members.length - pending - approved
    return { pending, approved, rejected, total: members.length }
  }, [members])

  useEffect(() => {
    if (!filteredMembers.length) {
      setSelectedMemberId(null)
      return
    }
    if (!selectedMemberId) {
      setSelectedMemberId(filteredMembers[0].id)
    } else {
      const stillVisible = filteredMembers.some((m) => m.id === selectedMemberId)
      if (!stillVisible) {
        setSelectedMemberId(filteredMembers[0].id)
      }
    }
  }, [filteredMembers, selectedMemberId])

  const selectedMember = filteredMembers.find((m) => m.id === selectedMemberId) || null

  if (loading) return <Skeleton />
  if (members.length === 0) return <EmptyState />

  return (
    <div className='min-h-screen bg-gray-50 p-4 sm:p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 mb-1'>Document Verification</h1>
              <p className='text-sm text-gray-600'>
                Total: <span className='font-semibold text-blue-600'>{members.length}</span> pending documents
              </p>
            </div>
            <button
              onClick={() => {
                const modal = document.getElementById('review-guidelines-modal')
                if (modal) (modal as any).showModal()
              }}
              className='px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors'
            >
              Guidelines
            </button>
          </div>
        </div>

        <div className='mb-4 grid grid-cols-4 gap-3'>
          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'>
            <p className='text-xs text-gray-600 mb-1'>Pending</p>
            <p className='text-2xl font-bold text-amber-600'>{summary.pending}</p>
          </div>
          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'>
            <p className='text-xs text-gray-600 mb-1'>Approved</p>
            <p className='text-2xl font-bold text-green-600'>{summary.approved}</p>
          </div>
          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'>
            <p className='text-xs text-gray-600 mb-1'>Rejected</p>
            <p className='text-2xl font-bold text-red-600'>{summary.rejected}</p>
          </div>
          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'>
            <p className='text-xs text-gray-600 mb-1'>Total</p>
            <p className='text-2xl font-bold text-gray-700'>{summary.total}</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className='mb-4 flex flex-col sm:flex-row gap-3'>
          <Input
            placeholder='Search by name, email, or phone...'
            prefix={<SearchOutlined className='text-gray-400' />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className='flex-1'
            size='large'
          />
          <Select 
            value={statusFilter} 
            onChange={setStatusFilter} 
            className='w-full sm:w-48' 
            size='large'
          >
            <Option value='ALL'>All Status</Option>
            <Option value='PENDING'>Pending</Option>
            <Option value='APPROVED'>Approved</Option>
            <Option value='REJECTED'>Rejected</Option>
          </Select>
        </div>

        {/* Results count */}
        {filteredMembers.length !== members.length && (
          <div className='mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600'>
            <span className='font-semibold'>Showing {filteredMembers.length}</span> of <span className='font-semibold'>{members.length}</span> members
            {searchTerm && <span className='ml-2'>matching "<span className='font-semibold text-blue-600'>{searchTerm}</span>"</span>}
            {statusFilter !== 'ALL' && <span className='ml-2'>with status "<span className='font-semibold text-blue-600'>{statusFilter}</span>"</span>}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedDocuments.size > 0 && (
          <div className='rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-5 mb-6 shadow-lg'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center'>
                  <span className='text-white font-bold text-lg'>{selectedDocuments.size}</span>
                </div>
                <div>
                  <p className='text-sm font-bold text-blue-900'>
                    {selectedDocuments.size} user(s) selected
                  </p>
                  <p className='text-xs text-blue-700'>
                    {getPendingDocumentIds().length} pending document(s) ready for review
                  </p>
                </div>
              </div>
              <Space className='flex-wrap'>
                <Button
                  icon={<CheckOutlined />}
                  type='primary'
                  onClick={handleBulkApprove}
                  loading={bulkApproveMutation.isPending}
                  size='large'
                  className='bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200'
                >
                  Approve Selected
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  danger
                  onClick={handleBulkReject}
                  loading={bulkRejectMutation.isPending}
                  size='large'
                  className='bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 border-0 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200'
                >
                  Reject Selected
                </Button>
                <Button
                  onClick={() => {
                    setSelectedDocuments(new Set())
                    setShowBulkActions(false)
                  }}
                  size='large'
                  className='border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200'
                >
                  Clear
                </Button>
              </Space>
            </div>
          </div>
        )}

        {filteredMembers.length === 0 ? (
          <div className='text-center py-16 text-gray-500 bg-white rounded-xl border-2 border-gray-200 shadow-sm'>
            <svg className='w-20 h-20 mx-auto mb-4 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
            </svg>
            <p className='text-lg font-semibold text-gray-700 mb-2'>
              {searchTerm || statusFilter !== 'ALL' ? 'No members match your filters' : 'No members found'}
            </p>
            <p className='text-sm text-gray-500'>
              {searchTerm || statusFilter !== 'ALL' 
                ? 'Try adjusting your search or filter criteria' 
                : 'All documents have been reviewed'}
            </p>
          </div>
        ) : (
          <div className='grid gap-6 lg:grid-cols-[300px,1fr]'>
            {/* Left Panel - Simplified User List */}
            <div className='space-y-2'>
              <div className='bg-white rounded-lg border border-gray-200 p-3 mb-3'>
                <div className='flex items-center gap-2 mb-2'>
                  <Checkbox
                    checked={
                      filteredMembers.length > 0 &&
                      filteredMembers.every((m) => selectedDocuments.has(m.id))
                    }
                    indeterminate={
                      selectedDocuments.size > 0 && selectedDocuments.size < filteredMembers.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span className='text-sm font-semibold text-gray-700'>Select All</span>
                </div>
                {selectedDocuments.size > 0 && (
                  <div className='text-xs text-blue-600 font-medium'>
                    {selectedDocuments.size} selected
                  </div>
                )}
              </div>
              <div className='space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto'>
                {filteredMembers.map((member) => {
                  const isActive = member.id === selectedMemberId
                  const isSelected = selectedDocuments.has(member.id)
                  const hasPendingDocs =
                    member.cccd.frontStatus === 'PENDING' ||
                    member.cccd.backStatus === 'PENDING' ||
                    member.gplx.frontStatus === 'PENDING' ||
                    member.gplx.backStatus === 'PENDING'
                  return (
                    <div
                      key={member.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedMemberId(member.id)}
                    >
                      <div className='flex items-start gap-2'>
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSelectMember(member.id, e.target.checked)
                          }}
                          disabled={!hasPendingDocs}
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-sm text-gray-900 truncate'>{member.name}</p>
                          <p className='text-xs text-gray-500 truncate'>{member.email}</p>
                          <div className='flex items-center gap-1 mt-1'>
                            <Tag 
                              color={
                                member.cccd.frontStatus === 'PENDING' || member.gplx.frontStatus === 'PENDING'
                                  ? 'orange'
                                  : 'green'
                              } 
                              className='text-xs'
                            >
                              {member.cccd.frontStatus === 'PENDING' || member.gplx.frontStatus === 'PENDING'
                                ? 'Pending'
                                : 'Done'}
                            </Tag>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Panel - Image-Focused Review */}
            {selectedMember ? (
              <div className='space-y-6'>
                {/* User Info Bar */}
                <div className='bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between'>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900'>{selectedMember.name}</h2>
                    <p className='text-sm text-gray-600'>{selectedMember.email}</p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => handleViewDetail(selectedMember.id)}
                      className='px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors'
                    >
                      View OCR
                    </button>
                    <Tag color='green' className='text-xs'>
                      {selectedMember.cccd.frontStatus}/{selectedMember.cccd.backStatus} CCCD
                    </Tag>
                    <Tag color='cyan' className='text-xs'>
                      {selectedMember.gplx.frontStatus}/{selectedMember.gplx.backStatus} DL
                    </Tag>
                  </div>
                </div>

                {/* Document Review - Image Focused */}
                <div className='space-y-8'>
                  {/* CCCD Section */}
                  <div className='bg-white rounded-lg border border-gray-200 p-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-blue-500' />
                        Citizen ID Card (CCCD)
                      </h3>
                      {selectedMember.cccd.frontStatus === 'PENDING' && selectedMember.cccd.backStatus === 'PENDING' && (
                        <div className='flex gap-2'>
                          <button
                            onClick={() => approveBothSides(selectedMember.id, 'cccd')}
                            className='px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2'
                          >
                            <CheckOutlined />
                            Approve Both
                          </button>
                          <button
                            onClick={() => rejectBothSides(selectedMember.id, 'cccd')}
                            className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2'
                          >
                            <CloseOutlined />
                            Reject Both
                          </button>
                        </div>
                      )}
                    </div>
                    <div className='grid md:grid-cols-2 gap-6'>
                      {/* Front Side */}
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <h4 className='font-semibold text-gray-700'>Front Side</h4>
                          <StatusBadge status={selectedMember.cccd.frontStatus} />
                        </div>
                        <div
                          className='relative rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer group hover:border-blue-400 transition-all'
                          onClick={() => setSelectedImage(selectedMember.cccd.frontImage)}
                        >
                          <img
                            src={getDecryptedImageUrl(selectedMember.cccd.frontImage)}
                            alt='Front'
                            className='w-full h-64 object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-300'
                          />
                          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center'>
                            <span className='text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black/50 px-3 py-1 rounded'>
                              Click to enlarge
                            </span>
                          </div>
                        </div>
                        {selectedMember.cccd.frontStatus === 'PENDING' && selectedMember.cccd.backStatus !== 'PENDING' && (
                          <div className='flex gap-2'>
                            <button
                              onClick={async () => {
                                const doc = selectedMember.cccd
                                if (doc.frontId) {
                                  const confirmed = window.confirm('Approve front side of CCCD?')
                                  if (!confirmed) return
                                  await staffApi.reviewDocument(doc.frontId, 'APPROVE')
                                  toast.success('Front side approved')
                                  await updateStatus(selectedMember.id, 'cccd', 'front', 'APPROVED')
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CheckOutlined />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const doc = selectedMember.cccd
                                if (doc.frontId) {
                                  Modal.confirm({
                                    title: 'Reject Front Side',
                                    content: (
                                      <div className='mt-4'>
                                        <Input.TextArea
                                          id='reject-front-reason'
                                          rows={3}
                                          placeholder='Enter rejection reason...'
                                        />
                                      </div>
                                    ),
                                    onOk: async (close) => {
                                      const reason = (document.getElementById('reject-front-reason') as HTMLTextAreaElement)?.value?.trim()
                                      if (!reason) {
                                        message.error('Rejection reason is required')
                                        return Promise.reject()
                                      }
                                      await staffApi.reviewDocument(doc.frontId!, 'REJECT', reason)
                                      toast.success('Document rejected')
                                      await updateStatus(selectedMember.id, 'cccd', 'front', 'REJECTED')
                                      close()
                                    }
                                  })
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CloseOutlined />
                              Reject
                            </button>
                          </div>
                        )}
                        {selectedMember.cccd.frontInfo && (
                          <div className='bg-gray-50 rounded-lg p-3 text-xs space-y-1'>
                            {selectedMember.cccd.frontInfo.documentNumber && (
                              <div><span className='font-semibold'>Doc #:</span> {selectedMember.cccd.frontInfo.documentNumber}</div>
                            )}
                            {selectedMember.cccd.frontInfo.dateOfBirth && (
                              <div><span className='font-semibold'>DOB:</span> {selectedMember.cccd.frontInfo.dateOfBirth}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Back Side */}
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <h4 className='font-semibold text-gray-700'>Back Side</h4>
                          <StatusBadge status={selectedMember.cccd.backStatus} />
                        </div>
                        <div
                          className='relative rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer group hover:border-blue-400 transition-all'
                          onClick={() => setSelectedImage(selectedMember.cccd.backImage)}
                        >
                          <img
                            src={getDecryptedImageUrl(selectedMember.cccd.backImage)}
                            alt='Back'
                            className='w-full h-64 object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-300'
                          />
                          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center'>
                            <span className='text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black/50 px-3 py-1 rounded'>
                              Click to enlarge
                            </span>
                          </div>
                        </div>
                        {selectedMember.cccd.backStatus === 'PENDING' && selectedMember.cccd.frontStatus !== 'PENDING' && (
                          <div className='flex gap-2'>
                            <button
                              onClick={async () => {
                                const doc = selectedMember.cccd
                                if (doc.backId) {
                                  const confirmed = window.confirm('Approve back side of CCCD?')
                                  if (!confirmed) return
                                  await staffApi.reviewDocument(doc.backId, 'APPROVE')
                                  toast.success('Back side approved')
                                  await updateStatus(selectedMember.id, 'cccd', 'back', 'APPROVED')
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CheckOutlined />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const doc = selectedMember.cccd
                                if (doc.backId) {
                                  Modal.confirm({
                                    title: 'Reject Back Side',
                                    content: (
                                      <div className='mt-4'>
                                        <Input.TextArea
                                          id='reject-back-reason'
                                          rows={3}
                                          placeholder='Enter rejection reason...'
                                        />
                                      </div>
                                    ),
                                    onOk: async (close) => {
                                      const reason = (document.getElementById('reject-back-reason') as HTMLTextAreaElement)?.value?.trim()
                                      if (!reason) {
                                        message.error('Rejection reason is required')
                                        return Promise.reject()
                                      }
                                      await staffApi.reviewDocument(doc.backId!, 'REJECT', reason)
                                      toast.success('Document rejected')
                                      await updateStatus(selectedMember.id, 'cccd', 'back', 'REJECTED')
                                      close()
                                    }
                                  })
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CloseOutlined />
                              Reject
                            </button>
                          </div>
                        )}
                        {selectedMember.cccd.backInfo && (
                          <div className='bg-gray-50 rounded-lg p-3 text-xs space-y-1'>
                            {selectedMember.cccd.backInfo.documentNumber && (
                              <div><span className='font-semibold'>Doc #:</span> {selectedMember.cccd.backInfo.documentNumber}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Driver License Section */}
                  <div className='bg-white rounded-lg border border-gray-200 p-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-green-500' />
                        Driver License (DL)
                      </h3>
                      {selectedMember.gplx.frontStatus === 'PENDING' && selectedMember.gplx.backStatus === 'PENDING' && (
                        <div className='flex gap-2'>
                          <button
                            onClick={() => approveBothSides(selectedMember.id, 'gplx')}
                            className='px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2'
                          >
                            <CheckOutlined />
                            Approve Both
                          </button>
                          <button
                            onClick={() => rejectBothSides(selectedMember.id, 'gplx')}
                            className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2'
                          >
                            <CloseOutlined />
                            Reject Both
                          </button>
                        </div>
                      )}
                    </div>
                    <div className='grid md:grid-cols-2 gap-6'>
                      {/* Front Side */}
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <h4 className='font-semibold text-gray-700'>Front Side</h4>
                          <StatusBadge status={selectedMember.gplx.frontStatus} />
                        </div>
                        <div
                          className='relative rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer group hover:border-blue-400 transition-all'
                          onClick={() => setSelectedImage(selectedMember.gplx.frontImage)}
                        >
                          <img
                            src={getDecryptedImageUrl(selectedMember.gplx.frontImage)}
                            alt='Front'
                            className='w-full h-64 object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-300'
                          />
                          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center'>
                            <span className='text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black/50 px-3 py-1 rounded'>
                              Click to enlarge
                            </span>
                          </div>
                        </div>
                        {selectedMember.gplx.frontStatus === 'PENDING' && selectedMember.gplx.backStatus !== 'PENDING' && (
                          <div className='flex gap-2'>
                            <button
                              onClick={async () => {
                                const doc = selectedMember.gplx
                                if (doc.frontId) {
                                  const confirmed = window.confirm('Approve front side of Driver License?')
                                  if (!confirmed) return
                                  await staffApi.reviewDocument(doc.frontId, 'APPROVE')
                                  toast.success('Front side approved')
                                  await updateStatus(selectedMember.id, 'gplx', 'front', 'APPROVED')
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CheckOutlined />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const doc = selectedMember.gplx
                                if (doc.frontId) {
                                  Modal.confirm({
                                    title: 'Reject Front Side',
                                    content: (
                                      <div className='mt-4'>
                                        <Input.TextArea
                                          id='reject-dl-front-reason'
                                          rows={3}
                                          placeholder='Enter rejection reason...'
                                        />
                                      </div>
                                    ),
                                    onOk: async (close) => {
                                      const reason = (document.getElementById('reject-dl-front-reason') as HTMLTextAreaElement)?.value?.trim()
                                      if (!reason) {
                                        message.error('Rejection reason is required')
                                        return Promise.reject()
                                      }
                                      await staffApi.reviewDocument(doc.frontId!, 'REJECT', reason)
                                      toast.success('Document rejected')
                                      await updateStatus(selectedMember.id, 'gplx', 'front', 'REJECTED')
                                      close()
                                    }
                                  })
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CloseOutlined />
                              Reject
                            </button>
                          </div>
                        )}
                        {selectedMember.gplx.frontInfo && (
                          <div className='bg-gray-50 rounded-lg p-3 text-xs space-y-1'>
                            {selectedMember.gplx.frontInfo.documentNumber && (
                              <div><span className='font-semibold'>Doc #:</span> {selectedMember.gplx.frontInfo.documentNumber}</div>
                            )}
                            {selectedMember.gplx.frontInfo.issueDate && (
                              <div><span className='font-semibold'>Issue:</span> {selectedMember.gplx.frontInfo.issueDate}</div>
                            )}
                            {selectedMember.gplx.frontInfo.expiryDate && (
                              <div><span className='font-semibold'>Expiry:</span> {selectedMember.gplx.frontInfo.expiryDate}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Back Side */}
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <h4 className='font-semibold text-gray-700'>Back Side</h4>
                          <StatusBadge status={selectedMember.gplx.backStatus} />
                        </div>
                        <div
                          className='relative rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer group hover:border-blue-400 transition-all'
                          onClick={() => setSelectedImage(selectedMember.gplx.backImage)}
                        >
                          <img
                            src={getDecryptedImageUrl(selectedMember.gplx.backImage)}
                            alt='Back'
                            className='w-full h-64 object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-300'
                          />
                          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center'>
                            <span className='text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black/50 px-3 py-1 rounded'>
                              Click to enlarge
                            </span>
                          </div>
                        </div>
                        {selectedMember.gplx.backStatus === 'PENDING' && selectedMember.gplx.frontStatus !== 'PENDING' && (
                          <div className='flex gap-2'>
                            <button
                              onClick={async () => {
                                const doc = selectedMember.gplx
                                if (doc.backId) {
                                  const confirmed = window.confirm('Approve back side of Driver License?')
                                  if (!confirmed) return
                                  await staffApi.reviewDocument(doc.backId, 'APPROVE')
                                  toast.success('Back side approved')
                                  await updateStatus(selectedMember.id, 'gplx', 'back', 'APPROVED')
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CheckOutlined />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const doc = selectedMember.gplx
                                if (doc.backId) {
                                  Modal.confirm({
                                    title: 'Reject Back Side',
                                    content: (
                                      <div className='mt-4'>
                                        <Input.TextArea
                                          id='reject-dl-back-reason'
                                          rows={3}
                                          placeholder='Enter rejection reason...'
                                        />
                                      </div>
                                    ),
                                    onOk: async (close) => {
                                      const reason = (document.getElementById('reject-dl-back-reason') as HTMLTextAreaElement)?.value?.trim()
                                      if (!reason) {
                                        message.error('Rejection reason is required')
                                        return Promise.reject()
                                      }
                                      await staffApi.reviewDocument(doc.backId!, 'REJECT', reason)
                                      toast.success('Document rejected')
                                      await updateStatus(selectedMember.id, 'gplx', 'back', 'REJECTED')
                                      close()
                                    }
                                  })
                                }
                              }}
                              className='flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                            >
                              <CloseOutlined />
                              Reject
                            </button>
                          </div>
                        )}
                        {selectedMember.gplx.backInfo && (
                          <div className='bg-gray-50 rounded-lg p-3 text-xs space-y-1'>
                            {selectedMember.gplx.backInfo.documentNumber && (
                              <div><span className='font-semibold'>Doc #:</span> {selectedMember.gplx.backInfo.documentNumber}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='bg-white rounded-lg border border-gray-200 p-12 text-center'>
                <svg className='w-16 h-16 mx-auto mb-4 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                </svg>
                <p className='text-lg font-medium text-gray-600'>Select a user to review documents</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(detailData || loadingDetail) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6'
            onClick={() => setDetailData(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className='bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto'
            >
              {loadingDetail ? (
                <div className='p-12 text-center'>
                  <div className='w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto'></div>
                  <p className='mt-4 text-gray-600'>Loading...</p>
                </div>
              ) : (
                detailData && (
                  <>
                    <div className='p-6 border-b flex justify-between items-center'>
                      <h2 className='text-2xl font-bold'>{detailData.fullName}</h2>
                      <button onClick={() => setDetailData(null)} className='p-2 hover:bg-gray-100 rounded'>
                        ✕
                      </button>
                    </div>
                    <div className='p-6 space-y-6'>
                      <div>
                        <h3 className='text-lg font-bold mb-3'>Citizen ID</h3>
                        <div className='grid md:grid-cols-2 gap-4'>
                          <DocumentDetailCard doc={detailData.documents.citizenIdImages.front} title='Front side' />
                          <DocumentDetailCard doc={detailData.documents.citizenIdImages.back} title='Back side' />
                        </div>
                      </div>
                      <div>
                        <h3 className='text-lg font-bold mb-3'>Driver license</h3>
                        <div className='grid md:grid-cols-2 gap-4'>
                          <DocumentDetailCard doc={detailData.documents.driverLicenseImages.front} title='Front side' />
                          <DocumentDetailCard doc={detailData.documents.driverLicenseImages.back} title='Back side' />
                        </div>
                      </div>
                    </div>
                  </>
                )
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            onClick={() => setSelectedImage(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6'
          >
            <img src={getDecryptedImageUrl(selectedImage)} alt='Preview' className='max-w-5xl w-full rounded-lg' />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Guidelines Modal */}
      <dialog id='review-guidelines-modal' className='modal'>
        <div className='modal-box max-w-3xl'>
          <form method='dialog'>
            <button className='btn btn-sm btn-circle btn-ghost absolute right-2 top-2'>✕</button>
          </form>
          <h3 className='font-bold text-2xl mb-4'>Document Review Guidelines</h3>

          <div className='space-y-6'>
            {/* Why Review Section */}
            <div>
              <h4 className='font-bold text-lg text-gray-900 mb-2 flex items-center gap-2'>
                <span className='bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>
                  1
                </span>
                Why Staff Review is Required?
              </h4>
              <div className='ml-10 space-y-2 text-gray-700'>
                <p>
                  • <strong>Security & Compliance:</strong> Verify user identity before allowing participation in
                  co-ownership groups
                </p>
                <p>
                  • <strong>Legal Protection:</strong> Ensure all participants have valid identification documents
                </p>
                <p>
                  • <strong>Quality Control:</strong> OCR may extract incorrect information - manual verification
                  catches errors
                </p>
                <p>
                  • <strong>Fraud Prevention:</strong> Detect fake, expired, or tampered documents
                </p>
              </div>
            </div>

            {/* What to Review Section */}
            <div>
              <h4 className='font-bold text-lg text-gray-900 mb-2 flex items-center gap-2'>
                <span className='bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>
                  2
                </span>
                What to Review?
              </h4>
              <div className='ml-10 space-y-4'>
                <div>
                  <p className='font-semibold text-gray-900 mb-1'>Image Quality Checklist:</p>
                  <ul className='list-disc list-inside space-y-1 text-gray-700 ml-4'>
                    <li>Image is clear and not blurred</li>
                    <li>All text is readable</li>
                    <li>Document is fully visible (not cropped)</li>
                    <li>No glare or shadows obscuring information</li>
                    <li>Both front and back sides are provided</li>
                  </ul>
                </div>
                <div>
                  <p className='font-semibold text-gray-900 mb-1'>OCR Information Verification:</p>
                  <ul className='list-disc list-inside space-y-1 text-gray-700 ml-4'>
                    <li>Document number matches the image</li>
                    <li>Date of birth is correct</li>
                    <li>Issue date and expiry date are valid</li>
                    <li>Address information (if available) is accurate</li>
                  </ul>
                </div>
                <div>
                  <p className='font-semibold text-gray-900 mb-1'>Document Validity:</p>
                  <ul className='list-disc list-inside space-y-1 text-gray-700 ml-4'>
                    <li>Document is not expired (check expiry date)</li>
                    <li>Document format matches the type (CCCD or Driver License)</li>
                    <li>Document appears authentic (not fake or tampered)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Approval Criteria Section */}
            <div>
              <h4 className='font-bold text-lg text-gray-900 mb-2 flex items-center gap-2'>
                <span className='bg-yellow-100 text-yellow-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>
                  3
                </span>
                Approval Criteria
              </h4>
              <div className='ml-10 space-y-2'>
                <div className='bg-green-50 border-l-4 border-green-500 p-3 rounded'>
                  <p className='font-semibold text-green-900 mb-1'>✅ APPROVE if:</p>
                  <ul className='list-disc list-inside space-y-1 text-green-800 ml-4 text-sm'>
                    <li>All checklist items pass</li>
                    <li>OCR information is accurate</li>
                    <li>Document is valid and not expired</li>
                    <li>Both sides are clear and complete</li>
                  </ul>
                </div>
                <div className='bg-red-50 border-l-4 border-red-500 p-3 rounded'>
                  <p className='font-semibold text-red-900 mb-1'>❌ REJECT if:</p>
                  <ul className='list-disc list-inside space-y-1 text-red-800 ml-4 text-sm'>
                    <li>Image is unclear, blurred, or cropped</li>
                    <li>OCR information doesn't match the document</li>
                    <li>Document is expired or invalid</li>
                    <li>Document appears fake or tampered</li>
                    <li>Missing required information</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Review Process Section */}
            <div>
              <h4 className='font-bold text-lg text-gray-900 mb-2 flex items-center gap-2'>
                <span className='bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>
                  4
                </span>
                Review Process
              </h4>
              <div className='ml-10 space-y-2 text-gray-700'>
                <p>1. Click on document image to view full size</p>
                <p>2. Compare OCR extracted information with the document image</p>
                <p>3. Verify all checklist items</p>
                <p>
                  4. Click{' '}
                  <span className='bg-green-500 text-white px-2 py-0.5 rounded text-xs font-semibold'>Approve</span> or{' '}
                  <span className='bg-red-500 text-white px-2 py-0.5 rounded text-xs font-semibold'>Reject</span>
                </p>
                <p>5. If rejecting, provide a clear reason for the user</p>
              </div>
            </div>
          </div>

          <div className='modal-action'>
            <form method='dialog'>
              <button className='btn btn-primary'>Got it!</button>
            </form>
          </div>
        </div>
        <form method='dialog' className='modal-backdrop'>
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}
