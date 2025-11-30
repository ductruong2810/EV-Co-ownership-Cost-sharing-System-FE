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

  const updateStatus = (id: string, type: DocType, side: Side, status: Status) => {
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, [type]: { ...x[type], [`${side}Status`]: status } } : x)))
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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 sm:p-6 relative overflow-hidden'>
      {/* Decorative background elements */}
      <div className='absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
      <div className='absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2' />
      
      <div className='max-w-7xl mx-auto relative z-10'>
        <div className='mb-8'>
          <div className='flex items-start justify-between mb-6'>
            <div>
              <h1 className='text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-3'>
                Document Verification
              </h1>
              <p className='text-gray-600 text-sm flex items-center gap-2'>
                <span className='w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse' />
                Review and verify user documents • Total: <span className='font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md'>{members.length}</span>{' '}
                pending documents
              </p>
            </div>
            <button
              onClick={() => {
                const modal = document.getElementById('review-guidelines-modal')
                if (modal) (modal as any).showModal()
              }}
              className='px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              Review Guidelines
            </button>
          </div>

          {/* Review Guidelines Info Card */}
          <div className='bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-6 mb-6 shadow-lg hover:shadow-xl transition-all duration-300'>
            <div className='flex items-start gap-3'>
              <div className='flex-shrink-0 mt-1'>
                <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <div className='flex-1'>
                <h3 className='font-bold text-gray-900 mb-2'>What to Review?</h3>
                <p className='text-sm text-gray-700 mb-3'>
                  Staff verification ensures document authenticity and compliance. Review the following:
                </p>
                <div className='grid md:grid-cols-3 gap-3 text-sm'>
                  <div className='flex items-start gap-2'>
                    <span className='text-blue-600 font-bold'>1.</span>
                    <div>
                      <span className='font-semibold text-gray-900'>Image Quality:</span>
                      <p className='text-gray-600'>Clear, readable, not blurred or cropped</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-2'>
                    <span className='text-blue-600 font-bold'>2.</span>
                    <div>
                      <span className='font-semibold text-gray-900'>OCR Accuracy:</span>
                      <p className='text-gray-600'>Extracted info matches the document</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-2'>
                    <span className='text-blue-600 font-bold'>3.</span>
                    <div>
                      <span className='font-semibold text-gray-900'>Validity:</span>
                      <p className='text-gray-600'>Not expired, format is correct</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='mb-6 grid gap-3 md:grid-cols-4'>
          <SummaryCard
            label='Pending review'
            value={summary.pending}
            accent='bg-amber-50 text-amber-700 border-amber-100'
          />
          <SummaryCard
            label='Fully approved'
            value={summary.approved}
            accent='bg-emerald-50 text-emerald-700 border-emerald-100'
          />
          <SummaryCard
            label='Requires attention'
            value={summary.rejected}
            accent='bg-rose-50 text-rose-700 border-rose-100'
          />
          <SummaryCard label='Total users' value={summary.total} accent='bg-slate-50 text-slate-700 border-slate-100' />
        </div>

        {/* Search and Filter Section */}
        <div className='mb-6 flex flex-col sm:flex-row gap-4'>
          <Input
            placeholder='Search by name, email, or phone...'
            prefix={<SearchOutlined className='text-gray-400' />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className='flex-1 shadow-lg border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl transition-all duration-200'
            size='large'
          />
          <Select 
            value={statusFilter} 
            onChange={setStatusFilter} 
            className='w-full sm:w-48 shadow-lg border-2 border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-200' 
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
          <div className='grid gap-6 lg:grid-cols-[1.2fr,1.8fr]'>
            {/* Left Panel - User List */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 mb-4 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200/50 shadow-lg'>
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
                <span className='text-sm font-bold text-gray-800'>Select All</span>
                {selectedDocuments.size > 0 && (
                  <span className='ml-auto text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full shadow-md'>
                    {selectedDocuments.size} selected
                  </span>
                )}
              </div>
              <div className='space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto pr-2'>
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
                      className={`w-full rounded-2xl border-2 px-5 py-4 transition-all duration-300 cursor-pointer backdrop-blur-sm ${
                        isActive
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl scale-[1.02] ring-2 ring-blue-200'
                          : isSelected
                            ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg'
                            : 'border-gray-200/50 bg-white/80 hover:border-blue-300 hover:shadow-xl hover:scale-[1.01] hover:bg-white'
                      }`}
                      onClick={() => setSelectedMemberId(member.id)}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-3 flex-1 min-w-0'>
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
                            <p className='text-base font-semibold text-gray-900 truncate'>{member.name}</p>
                            <p className='text-xs text-gray-500 truncate'>
                              {member.email}
                            </p>
                            <p className='text-xs text-gray-400 truncate'>
                              {member.phone}
                            </p>
                          </div>
                        </div>
                        <Tag 
                          color={
                            member.cccd.frontStatus === 'PENDING' || member.gplx.frontStatus === 'PENDING'
                              ? 'orange'
                              : member.cccd.frontStatus === 'APPROVED' && member.gplx.frontStatus === 'APPROVED'
                                ? 'green'
                                : 'blue'
                          } 
                          className='rounded-full font-medium flex-shrink-0'
                        >
                          {member.cccd.frontStatus === 'PENDING' || member.gplx.frontStatus === 'PENDING'
                            ? 'Pending'
                            : member.cccd.frontStatus === 'APPROVED' && member.gplx.frontStatus === 'APPROVED'
                              ? 'Approved'
                              : 'Mixed'}
                        </Tag>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Panel - Document Details */}
            <div className='rounded-3xl border-2 border-gray-200/50 bg-white/90 backdrop-blur-md p-8 shadow-2xl'>
              {selectedMember ? (
                <div className='space-y-6'>
                  {/* User Header */}
                  <div className='flex flex-wrap items-start justify-between gap-4 pb-6 border-b-2 border-gray-200'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-blue-500 animate-pulse' />
                        Selected user
                      </p>
                      <h2 className='text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2'>{selectedMember.name}</h2>
                      <p className='text-sm text-gray-600 mb-3'>{selectedMember.email}</p>
                      <button
                        onClick={() => handleViewDetail(selectedMember.id)}
                        className='rounded-xl border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2.5 text-sm font-bold text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105'
                      >
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                        </svg>
                        View OCR details
                      </button>
                    </div>
                    <div className='flex flex-col gap-3'>
                      <Tag color='green' className='rounded-full px-4 py-1.5 font-bold text-sm shadow-md'>
                        {selectedMember.cccd.frontStatus}/{selectedMember.cccd.backStatus} CCCD
                      </Tag>
                      <Tag color='cyan' className='rounded-full px-4 py-1.5 font-bold text-sm shadow-md'>
                        {selectedMember.gplx.frontStatus}/{selectedMember.gplx.backStatus} DL
                      </Tag>
                    </div>
                  </div>
                  {/* Document Sections */}
                  <div className='grid gap-6 md:grid-cols-2'>
                    <DocumentSection
                      member={selectedMember}
                      docType='cccd'
                      onPreview={(img) => setSelectedImage(img)}
                      onUpdateStatus={updateStatus}
                    />
                    <DocumentSection
                      member={selectedMember}
                      docType='gplx'
                      onPreview={(img) => setSelectedImage(img)}
                      onUpdateStatus={updateStatus}
                    />
                  </div>
                </div>
              ) : (
                <div className='flex h-[400px] items-center justify-center text-gray-400'>
                  <div className='text-center'>
                    <svg className='w-16 h-16 mx-auto mb-4 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                    </svg>
                    <p className='text-lg font-medium'>Select a user to review documents</p>
                    <p className='text-sm mt-1'>Choose a user from the list to view their documents</p>
                  </div>
                </div>
              )}
            </div>
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
