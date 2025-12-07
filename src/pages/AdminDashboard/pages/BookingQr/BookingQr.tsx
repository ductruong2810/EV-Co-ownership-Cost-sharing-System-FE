/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from 'react-router-dom'
import { useRef, useState, useMemo } from 'react'
import { Input, Select, Button, Card, Spin } from 'antd'
import { SearchOutlined, ArrowLeftOutlined, QrcodeOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import adminApi from '../../../../apis/admin.api'
import staffApi from '../../../../apis/staff.api'
import EmptyQRCard from './components/EmptyQRCard'
import EmptyState from '../EmptyState'
import { useI18n } from '../../../../i18n/useI18n'

const { Option } = Select

export default function BookingQr() {
  const { t } = useI18n()
  const { userId, groupId } = useParams()
  const navigate = useNavigate()
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [checkinFilter, setCheckinFilter] = useState<string>('ALL')

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await staffApi.getUsers()
      const user = Array.isArray(res?.data) ? res.data.find((u: any) => u.userId === Number(userId)) : null
      return user
    },
    enabled: !!userId,
    retry: 1
  })

  // Fetch group info
  const { data: groupInfo } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (!userId) return null
      const res = await staffApi.getAllGroupsByUserId(Number(userId))
      const group = Array.isArray(res?.data) ? res.data.find((g: any) => g.groupId === Number(groupId)) : null
      return group
    },
    enabled: !!userId && !!groupId,
    retry: 1
  })

  const {
    data: bookingResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['booking', userId, groupId],
    queryFn: () =>
      adminApi.getQrBookingByUserIdAndGroupId({
        userId: Number(userId),
        groupId: Number(groupId)
      }),
    enabled: !!userId && !!groupId,
    retry: 1
  })

  const allBookings = bookingResponse?.data?.content || []

  // Summary statistics
  const summary = useMemo(() => {
    return {
      total: allBookings.length,
      checkedIn: allBookings.filter((b: any) => b.qrCodeCheckin && !b.qrCodeCheckout).length,
      checkedOut: allBookings.filter((b: any) => b.qrCodeCheckout).length,
      notCheckedIn: allBookings.filter((b: any) => !b.qrCodeCheckin).length,
      confirmed: allBookings.filter((b: any) => b.status === 'CONFIRMED').length
    }
  }, [allBookings])

  // Filter and search logic
  const bookings = useMemo(() => {
    let filtered = allBookings

    // Search by booking ID, license plate, or brand
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (booking: any) =>
          booking.bookingId.toString().includes(searchTerm) ||
          booking.licensePlate?.toLowerCase().includes(searchLower) ||
          booking.brand?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by booking status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((booking: any) => booking.status === statusFilter)
    }

    // Filter by check-in/check-out status
    if (checkinFilter === 'CHECKED_IN') {
      filtered = filtered.filter((booking: any) => booking.qrCodeCheckin && !booking.qrCodeCheckout)
    } else if (checkinFilter === 'CHECKED_OUT') {
      filtered = filtered.filter((booking: any) => booking.qrCodeCheckout)
    } else if (checkinFilter === 'NOT_CHECKED_IN') {
      filtered = filtered.filter((booking: any) => !booking.qrCodeCheckin)
    }

    return filtered
  }, [allBookings, searchTerm, statusFilter, checkinFilter])

  //function help download QR code as PNG
  const handleDownload = (bookingId: number, phase: string) => {
    const canvas = qrRefs.current[`${bookingId}-${phase}`]?.querySelector('canvas') as HTMLCanvasElement
    if (canvas) {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `booking-${bookingId}-${phase.toLowerCase()}-qr.png`
      link.click()
    }
  }

  const QRCardContent = ({ qrData, phase }: any) => {
    const isCHECKIN = phase === 'CHECKIN'
    const colors = isCHECKIN
      ? {
          header: 'bg-teal-700',
          badge: 'bg-teal-100 text-teal-700',
          border: 'border-teal-300',
          button: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
          qr: '#0d9488'
        }
      : {
          header: 'bg-gray-700',
          badge: 'bg-gray-100 text-gray-700',
          border: 'border-gray-300',
          button: 'bg-gray-50 text-gray-700 hover:bg-gray-100',
          qr: '#4b5563'
        }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white rounded-2xl shadow-sm border ${colors.border} overflow-hidden hover:shadow-md transition-shadow`}
      >
        <div className={`${colors.header} px-6 py-4 flex justify-between items-center`}>
          <p className='font-bold text-lg text-white'>{phase}</p>
          <span className={`${colors.badge} px-3 py-1 rounded-md text-xs font-semibold`}>{phase}</span>
        </div>

        <div className='p-6 flex items-center justify-center bg-white'>
          <div
            ref={(el) => {
              if (el) qrRefs.current[`${qrData.bookingId}-${phase}`] = el.parentElement as HTMLDivElement
            }}
            className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'
          >
            <QRCodeCanvas value={JSON.stringify(qrData)} size={200} level='H' fgColor={colors.qr} bgColor='#ffffff' />
          </div>
        </div>

        <div className='px-6 py-3 space-y-2 border-t border-gray-100 text-sm'>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('admin_booking_qr_vehicle_id')}</span>
            <span className='font-semibold text-gray-800'>{qrData.vehicleId}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('admin_booking_qr_start')}</span>
            <span className='font-semibold text-gray-800 text-xs'>
              {new Date(qrData.startTime).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('admin_booking_qr_end')}</span>
            <span className='font-semibold text-gray-800 text-xs'>
              {new Date(qrData.endTime).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleDownload(qrData.bookingId, phase)}
          className={`w-full px-6 py-3 font-medium border-t border-gray-100 transition-colors ${colors.button}`}
        >
          {t('admin_booking_qr_download', { phase })}
        </motion.button>
      </motion.div>
    )
  }

  if (error)
    return (
      <div className='min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex items-center justify-center p-6'>
        <div className='bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-lg max-w-md text-center'>
          <p className='font-semibold text-lg mb-2'>{t('admin_booking_qr_error_load')}</p>
          <p className='text-sm'>
            {error instanceof Error ? error.message : t('admin_booking_qr_error_unknown')}
          </p>
          <Button
            type='primary'
            onClick={() => refetch()}
            className='mt-4'
          >
            {t('admin_dashboard_retry')}
          </Button>
        </div>
      </div>
    )
  
  if (!allBookings.length) return <EmptyState />

  return (
    <div className='min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 sm:p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Loading State */}
        {isLoading && (
          <div className='mb-6 flex items-center justify-center py-8 bg-white rounded-xl shadow-sm border border-gray-100'>
            <Spin size='large' />
            <span className='ml-3 text-gray-600 font-medium'>{t('admin_booking_qr_loading')}</span>
          </div>
        )}

        {/* Breadcrumb */}
        <div className='mb-4'>
          <Button
            type='text'
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/manager/checkBooking')}
            className='text-gray-600 hover:text-gray-900'
          >
            {t('admin_booking_qr_back')}
          </Button>
        </div>

        {/* Header */}
        <div className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <QrcodeOutlined className='text-3xl text-teal-600' />
            <h1 className='text-3xl font-bold text-gray-900'>{t('admin_booking_qr_title')}</h1>
          </div>
          
          {/* User & Group Info */}
          <div className='flex flex-wrap items-center gap-3 mb-4'>
            <div className='flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200'>
              <span className='text-sm font-semibold text-gray-600'>{t('admin_booking_qr_user')}:</span>
              <span className='bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium'>
                {userInfo?.fullName || t('admin_booking_qr_id', { id: userId })}
              </span>
            </div>
            <div className='flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200'>
              <span className='text-sm font-semibold text-gray-600'>{t('admin_booking_qr_group')}:</span>
              <span className='bg-purple-100 text-purple-800 px-3 py-1 rounded-md text-sm font-medium'>
                {groupInfo?.groupName || t('admin_booking_qr_id', { id: groupId })}
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className='grid grid-cols-2 md:grid-cols-5 gap-3 mb-6'>
            <Card className='text-center shadow-sm border-gray-200'>
              <div className='text-2xl font-bold text-gray-900'>{summary.total}</div>
              <div className='text-xs text-gray-500 mt-1'>{t('admin_booking_qr_summary_total')}</div>
            </Card>
            <Card className='text-center shadow-sm border-green-200 bg-green-50'>
              <div className='text-2xl font-bold text-green-700'>{summary.confirmed}</div>
              <div className='text-xs text-green-600 mt-1'>{t('admin_booking_qr_summary_confirmed')}</div>
            </Card>
            <Card className='text-center shadow-sm border-teal-200 bg-teal-50'>
              <div className='text-2xl font-bold text-teal-700'>{summary.checkedIn}</div>
              <div className='text-xs text-teal-600 mt-1'>{t('admin_booking_qr_summary_checked_in')}</div>
            </Card>
            <Card className='text-center shadow-sm border-gray-200 bg-gray-50'>
              <div className='text-2xl font-bold text-gray-700'>{summary.checkedOut}</div>
              <div className='text-xs text-gray-600 mt-1'>{t('admin_booking_qr_summary_checked_out')}</div>
            </Card>
            <Card className='text-center shadow-sm border-orange-200 bg-orange-50'>
              <div className='text-2xl font-bold text-orange-700'>{summary.notCheckedIn}</div>
              <div className='text-xs text-orange-600 mt-1'>{t('admin_booking_qr_summary_pending')}</div>
            </Card>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className='mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4'>
          <div className='flex flex-col sm:flex-row gap-3'>
            <Input
              placeholder={t('admin_booking_qr_search_placeholder')}
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
              <Option value='ALL'>{t('admin_booking_qr_status_all')}</Option>
              <Option value='CONFIRMED'>{t('admin_booking_qr_status_confirmed')}</Option>
              <Option value='CANCELLED'>{t('admin_booking_qr_status_cancelled')}</Option>
              <Option value='PENDING'>{t('admin_booking_qr_status_pending')}</Option>
            </Select>
            <Select
              value={checkinFilter}
              onChange={setCheckinFilter}
              className='w-full sm:w-48'
              size='large'
            >
              <Option value='ALL'>{t('admin_booking_qr_checkin_all')}</Option>
              <Option value='NOT_CHECKED_IN'>{t('admin_booking_qr_checkin_not_checked_in')}</Option>
              <Option value='CHECKED_IN'>{t('admin_booking_qr_checkin_checked_in_only')}</Option>
              <Option value='CHECKED_OUT'>{t('admin_booking_qr_checkin_checked_out')}</Option>
            </Select>
          </div>

          {/* Results count */}
          {(bookings.length !== allBookings.length || searchTerm || statusFilter !== 'ALL' || checkinFilter !== 'ALL') && (
            <div className='mt-3 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg'>
              {t('admin_booking_qr_showing_results', {
                showing: bookings.length,
                total: allBookings.length,
                searchTerm: searchTerm ? ` "${searchTerm}"` : '',
                status: statusFilter !== 'ALL' ? ` "${statusFilter}"` : '',
                checkinStatus: checkinFilter !== 'ALL' ? ` "${checkinFilter.replace('_', ' ')}"` : ''
              })}
            </div>
          )}
        </div>

        {/* Bookings List */}
        <div className='space-y-4'>
          {bookings.length === 0 ? (
            <Card className='text-center py-12 shadow-sm border-gray-200'>
              <ClockCircleOutlined className='text-5xl text-gray-300 mb-4' />
              <p className='text-lg font-semibold text-gray-700 mb-2'>
                {searchTerm || statusFilter !== 'ALL' || checkinFilter !== 'ALL' ? t('admin_booking_qr_no_match') : t('admin_booking_qr_no_bookings')}
              </p>
              <p className='text-sm text-gray-500'>
                {searchTerm || statusFilter !== 'ALL' || checkinFilter !== 'ALL' 
                  ? t('admin_booking_qr_try_adjusting') 
                  : t('admin_booking_qr_no_bookings_group')}
              </p>
            </Card>
          ) : (
            bookings.map((booking, idx) => (
              <motion.div
                key={booking.bookingId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* Header - Click to Toggle */}
                <motion.div
                  onClick={() => setExpandedId(expandedId === booking.bookingId ? null : booking.bookingId)}
                  className='bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-teal-400 cursor-pointer transition-all'
                >
                  <div className='px-6 py-4 flex items-center justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        <h3 className='text-lg font-bold text-gray-900'>{t('admin_booking_qr_booking_id', { id: booking.bookingId })}</h3>
                        <span className='px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full'>
                          {t('admin_booking_qr_id_label', { id: booking.bookingId })}
                        </span>
                      </div>
                      <div className='flex items-center gap-3 text-sm text-gray-600 mb-2'>
                        <span className='font-semibold text-gray-800'>{booking.licensePlate}</span>
                        <span className='text-gray-400'>•</span>
                        <span>{booking.brand}</span>
                      </div>
                      <div className='flex items-center gap-2 mt-2 text-xs text-gray-500'>
                        <span className='bg-gray-100 px-2 py-1 rounded'>{new Date(booking.startDateTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className='text-gray-400'>→</span>
                        <span className='bg-gray-100 px-2 py-1 rounded'>{new Date(booking.endDateTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      <span
                        className={`px-3 py-1 rounded-md text-xs font-medium ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-green-50 text-green-700'
                            : booking.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {booking.status}
                      </span>
                      <motion.svg
                        animate={{ rotate: expandedId === booking.bookingId ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className='w-5 h-5 text-gray-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
                      </motion.svg>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className='px-6 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs'>
                    <div className='flex items-center gap-2'>
                      <div className={`w-2 h-2 rounded-full ${booking.qrCodeCheckin ? 'bg-teal-600' : 'bg-gray-300'}`} />
                      <span className='text-gray-600'>{booking.qrCodeCheckin ? t('admin_booking_qr_check_in_done') : t('admin_booking_qr_check_in')}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className={`w-2 h-2 rounded-full ${booking.qrCodeCheckout ? 'bg-gray-600' : 'bg-gray-300'}`} />
                      <span className='text-gray-600'>{booking.qrCodeCheckout ? t('admin_booking_qr_check_out_done') : t('admin_booking_qr_check_out')}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Expanded QR Codes */}
                <AnimatePresence>
                  {expandedId === booking.bookingId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className='mt-4 grid grid-cols-1 md:grid-cols-2 gap-6'
                    >
                      {booking.qrCodeCheckin ? (
                        <QRCardContent qrData={booking.qrCodeCheckin} phase='CHECKIN' />
                      ) : (
                        <EmptyQRCard phase='CHECKIN' />
                      )}
                      {booking.qrCodeCheckout ? (
                        <QRCardContent qrData={booking.qrCodeCheckout} phase='CHECKOUT' />
                      ) : (
                        <EmptyQRCard phase='CHECKOUT' />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
