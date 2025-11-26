/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, useMemo, type ComponentType } from 'react'
import { Input, Select } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import staffApi from '../../../../apis/staff.api'
import { getDecryptedImageUrl } from '../../../../utils/imageUrl'
import Skeleton from '../../../../components/Skeleton'
import ImageCardComponent from './components/ImageCard/ImageCard'
import EmptyState from '../EmptyState'
import type { DocumentInfo, UserDetails } from '../../../../types/api/staff.type'

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
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const [detailData, setDetailData] = useState<UserDetails | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

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

  const toggleMember = (id: string) => {
    setExpandedMembers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

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
          return member.cccd.frontStatus === 'PENDING' || member.cccd.backStatus === 'PENDING' || member.gplx.frontStatus === 'PENDING' || member.gplx.backStatus === 'PENDING'
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

const DocumentSection = ({ member, docType }: { member: Member; docType: DocType }) => {
    const doc = member[docType]
    const { title, shortTitle, accent } = DOC_CONFIG[docType]

    return (
      <div className='bg-gray-50 rounded-lg border border-gray-200'>
        <div className='px-4 py-2 bg-white border-b'>
          <span
            className='text-xs font-bold uppercase px-2 py-0.5 rounded text-white'
            style={{ backgroundColor: accent }}
          >
            {shortTitle}
          </span>
          <span className='text-sm font-medium text-gray-700 ml-2'>{title}</span>
        </div>
        <div className='p-3 space-y-3'>
          <ImageCardAny
            image={doc.frontImage}
            alt='Front side'
            status={doc.frontStatus}
            documentId={doc.frontId}
            setSelected={setSelected}
            onApprove={() => updateStatus(member.id, docType, 'front', 'APPROVED')}
            onReject={() => updateStatus(member.id, docType, 'front', 'REJECTED')}
            documentInfo={doc.frontInfo}
          />
          <ImageCardAny
            image={doc.backImage}
            alt='Back side'
            status={doc.backStatus}
            documentId={doc.backId}
            setSelected={setSelected}
            onApprove={() => updateStatus(member.id, docType, 'back', 'APPROVED')}
            onReject={() => updateStatus(member.id, docType, 'back', 'REJECTED')}
            documentInfo={doc.backInfo}
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
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
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
                  <p className={`mt-0.5 ${doc.expiryDate && new Date(doc.expiryDate) < new Date() ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
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
              <p className='text-gray-900 mt-1 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200'>{doc.reviewNote}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) return <Skeleton />
  if (members.length === 0) return <EmptyState />

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6'>
      <div className='max-w-6xl mx-auto'>
        <div className='mb-8'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>Document Verification</h1>
              <p className='text-gray-600'>
                Review and verify user documents • Total: <span className='font-semibold'>{members.length}</span> pending documents
              </p>
            </div>
            <button
              onClick={() => {
                const modal = document.getElementById('review-guidelines-modal')
                if (modal) (modal as any).showModal()
              }}
              className='px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
              Review Guidelines
            </button>
          </div>
          
          {/* Review Guidelines Info Card */}
          <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6'>
            <div className='flex items-start gap-3'>
              <div className='flex-shrink-0 mt-1'>
                <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
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

        {/* Search and Filter Section */}
        <div className='mb-6 flex flex-col sm:flex-row gap-4'>
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
          <div className='flex gap-2'>
            <button
              onClick={() => setExpandedMembers(new Set(filteredMembers.map((m) => m.id)))}
              className='px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap'
            >
              Expand all
            </button>
            <button
              onClick={() => setExpandedMembers(new Set())}
              className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors whitespace-nowrap'
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Results count */}
        {filteredMembers.length !== members.length && (
          <div className='mb-4 text-sm text-gray-600'>
            Showing {filteredMembers.length} of {members.length} members
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}
          </div>
        )}

        <div className='space-y-3'>
        {filteredMembers.length === 0 ? (
          <div className='text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200'>
            {searchTerm || statusFilter !== 'ALL' ? 'No members match your filters' : 'No members found'}
          </div>
        ) : (
          filteredMembers.map((member) => (
          <div key={member.id} className='bg-white rounded-lg border shadow-sm'>
            <div className='p-4 flex items-center justify-between'>
              <div className='flex items-center gap-3 flex-1'>
                <div className='w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold'>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className='font-bold'>{member.name}</h3>
                  <p className='text-xs text-gray-600'>
                    {member.email} • {member.phone}
                  </p>
                </div>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => handleViewDetail(member.id)}
                  className='px-4 py-2 bg-blue-600 text-white text-sm rounded'
                >
                  Details
                </button>
                <button onClick={() => toggleMember(member.id)} className='p-2'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                  </svg>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expandedMembers.has(member.id) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className='overflow-hidden'
                >
                  <div className='p-4 border-t bg-gray-50 grid md:grid-cols-2 gap-4'>
                    <DocumentSection member={member} docType='cccd' />
                    <DocumentSection member={member} docType='gplx' />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          ))
        )}
        </div>
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
        {selected && (
          <motion.div
            onClick={() => setSelected(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6'
          >
            <img src={getDecryptedImageUrl(selected)} alt='Preview' className='max-w-5xl w-full rounded-lg' />
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
                <span className='bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>1</span>
                Why Staff Review is Required?
              </h4>
              <div className='ml-10 space-y-2 text-gray-700'>
                <p>• <strong>Security & Compliance:</strong> Verify user identity before allowing participation in co-ownership groups</p>
                <p>• <strong>Legal Protection:</strong> Ensure all participants have valid identification documents</p>
                <p>• <strong>Quality Control:</strong> OCR may extract incorrect information - manual verification catches errors</p>
                <p>• <strong>Fraud Prevention:</strong> Detect fake, expired, or tampered documents</p>
              </div>
            </div>

            {/* What to Review Section */}
            <div>
              <h4 className='font-bold text-lg text-gray-900 mb-2 flex items-center gap-2'>
                <span className='bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>2</span>
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
                <span className='bg-yellow-100 text-yellow-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>3</span>
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
                <span className='bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm'>4</span>
                Review Process
              </h4>
              <div className='ml-10 space-y-2 text-gray-700'>
                <p>1. Click on document image to view full size</p>
                <p>2. Compare OCR extracted information with the document image</p>
                <p>3. Verify all checklist items</p>
                <p>4. Click <span className='bg-green-500 text-white px-2 py-0.5 rounded text-xs font-semibold'>Approve</span> or <span className='bg-red-500 text-white px-2 py-0.5 rounded text-xs font-semibold'>Reject</span></p>
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
