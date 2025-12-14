// VehicleBookingCalendar.tsx - IMPROVED BADGE & LEGEND DESIGN
import { ClockCircleOutlined, ToolOutlined, CalendarOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useContext, useEffect, useState, useMemo } from 'react'
import { Card, Tag } from 'antd'
import { useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import groupApi from '../../../../apis/group.api'

import { setGroupIdToLS } from '../../../../utils/auth'
import BookingSlotCell from './components/BookingSlotCell'
import DetailStatusBooking from './components/DetailStatusBooking'
import QuotaCard from './components/QuotaCard'
import Statsbar from './components/StatsBar'
import StatusCard from './components/StatusCard'
import VehicleInforCard from './components/VehicleInforCard'
import UsageAnalyticsCard from './components/UsageAnalyticsCard'
import AISuggestionPanel from './components/AISuggestionPanel'
import FlexibleBookingModal from './components/FlexibleBookingModal'
import { AppContext } from '../../../../contexts/app.context'

// ============= INTERFACES (giữ nguyên) =============
type SlotStatus = 'AVAILABLE' | 'LOCKED' | 'CONFIRMED' | 'CANCELLED' | ''
type SlotType =
  | 'AVAILABLE'
  | 'MAINTENANCE'
  | 'BOOKED_SELF'
  | 'BOOKED_OTHER'
  | 'LOCKED'
  | 'AWAITING_REVIEW'
  | ''
  | 'COMPLETED'
  | 'CHECKED_IN_OTHER'
  | 'CHECKED_IN_SELF'

interface TimeSlot {
  time: string
  status: SlotStatus
  bookedBy: string | null
  bookable: boolean
  type: SlotType
  bookingId: number | null
}
interface DailySlot {
  date: string | ''
  dayOfWeek: string | ''
  slots: TimeSlot[] | []
}

interface QuotaInfo {
  remainingSlots: number
  totalSlots: number
  usedSlots: number
}

// ============= INITIAL MOCK DATA (giữ nguyên) =============

// ============= MAIN COMPONENT =============
const BookingCar = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const { setGroupId, subscribeGroupNotifications, unsubscribeGroupNotifications } = useContext(AppContext)

  useEffect(() => {
    if (!groupId) return
    setGroupId(groupId)
    setGroupIdToLS(groupId)
    subscribeGroupNotifications(groupId)

    return () => {
      unsubscribeGroupNotifications(groupId)
    }
  }, [groupId, setGroupId, subscribeGroupNotifications, unsubscribeGroupNotifications])
  const bookingQuery = useQuery({
    queryKey: ['vehicle-bookings'],
    queryFn: () => groupApi.getBookingCalendar(groupId as string),
    enabled: !!groupId
  })

  const smartSuggestionQuery = useQuery({
    queryKey: ['smart-suggestions', groupId],
    queryFn: () => groupApi.getSmartSuggestions(groupId as string),
    enabled: !!groupId
  })

  // data
  const data = bookingQuery?.data?.data

  // quota - memoized to prevent unnecessary recalculations
  const quotaUser: QuotaInfo = useMemo(() => ({
    totalSlots: bookingQuery?.data?.data?.userQuota?.totalSlots ?? 0,
    usedSlots: bookingQuery?.data?.data?.userQuota?.usedSlots ?? 0,
    remainingSlots: bookingQuery?.data?.data?.userQuota?.remainingSlots ?? 0
  }), [bookingQuery?.data?.data?.userQuota])

  // dailySlots - memoized to prevent unnecessary recalculations
  const dailySlots: DailySlot[] = useMemo(() =>
    bookingQuery?.data?.data?.dailySlots?.map((day) => ({
      date: day.date ?? '',
      dayOfWeek: day.dayOfWeek ?? '',
      slots:
        day.slots?.map((slot) => ({
          time: slot.time ?? '',
          status: slot.status ?? '',
          bookedBy: slot.bookedBy ?? null,
          bookable: slot.bookable ?? false,
          bookingId: slot.bookingId ?? null,
          type: slot.type ?? ''
        })) ?? []
    })) ?? []
  , [bookingQuery?.data?.data?.dailySlots])

  // groupSummary
  const groupSummary = bookingQuery?.data?.data?.dashboardSummary

  const vehicleStatus = bookingQuery?.data?.data?.dashboardSummary?.vehicleStatus || ''
  const queryClient = useQueryClient()
  const [isFlexibleModalVisible, setIsFlexibleModalVisible] = useState(false)

  // Flexible booking mutation
  const flexibleBookingMutation = useMutation({
    mutationFn: (body: { vehicleId: number; startDateTime: string; endDateTime: string }) =>
      groupApi.bookingSlot(body),
    onSuccess: (response) => {
      toast.success(response?.data?.message || 'Booking created successfully!')
      queryClient.invalidateQueries({ queryKey: ['vehicle-bookings'] })
      setIsFlexibleModalVisible(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create booking')
    }
  })

  const handleFlexibleBooking = (data: { startDateTime: string; endDateTime: string }) => {
    if (!groupSummary?.vehicleId) {
      toast.error('Vehicle information not available')
      return
    }
    flexibleBookingMutation.mutate({
      vehicleId: groupSummary.vehicleId,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime
    })
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40 p-4 md:p-8 my-5 rounded-2xl'>
      <div className='max-w-[96vw] mx-auto'>
        {/* Header Section */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8'>
          {/* Vehicle Info Card */}
          <VehicleInforCard
            brand={groupSummary?.brand || ''}
            licensePlate={groupSummary?.licensePlate || ''}
            weekStart={data?.weekStart || ''}
            weekEnd={data?.weekEnd || ''}
            model={groupSummary?.model || ''}
          />
          {/* Quota Card */}
          <QuotaCard quotaUser={quotaUser} />
          {/* Status Card */}
          <StatusCard
            vehicleStatus={groupSummary?.vehicleStatus || ''}
            batteryPercent={groupSummary?.batteryPercent || 0}
            odometer={groupSummary?.odometer || 0}
          />
        </div>

        {/* Stats Bar */}
        <Statsbar totalBookings={groupSummary?.totalBookings || 0} quotaUser={quotaUser} />

        {/* Booking Calendar Table - Main content first */}
        <Card className='shadow-2xl border-0 rounded-3xl overflow-hidden mb-8 hover:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] transition-all duration-500 bg-white'>
          {bookingQuery.isLoading ? (
            <div className='p-4 md:p-8'>
              <div className='animate-pulse'>
                {/* Header skeleton */}
                <div className='h-16 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-lg mb-4'></div>
                {/* Table rows skeleton */}
                <div className='space-y-3'>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className='flex gap-3'>
                      <div className='w-32 h-20 bg-gray-200 rounded-lg'></div>
                      <div className='flex-1 grid grid-cols-7 gap-3'>
                        {[...Array(7)].map((_, j) => (
                          <div key={j} className='h-20 bg-gray-100 rounded-lg'></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : dailySlots.length === 0 || !dailySlots[0]?.slots?.length ? (
            <div className='p-8 md:p-12 text-center'>
              <div className='text-5xl md:text-6xl mb-4' role='img' aria-label='Calendar icon'>
                📅
              </div>
              <h3 className='text-lg md:text-xl font-bold text-gray-800 mb-2'>No booking slots available</h3>
              <p className='text-sm md:text-base text-gray-600'>There are no time slots available for this week.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              {/* Single calendar table */}
              <table className='w-full border-collapse' aria-label='Vehicle booking calendar'>
              <thead>
                <tr className='bg-gradient-to-r from-[#06B6D4] via-[#0EA5E9] to-[#22D3EE]'>
                  <th
                    className='p-4 md:p-6 text-left font-black text-white text-base md:text-lg w-40 md:w-56 sticky left-0 z-10 bg-[#06B6D4]'
                    scope='col'
                  >
                    <div className='flex items-center gap-2 md:gap-3'>
                      <ClockCircleOutlined style={{ fontSize: '18px' }} aria-hidden='true' />
                      <span className='uppercase tracking-wide'>Time Slot</span>
                    </div>
                  </th>

                  {dailySlots.map((day) => (
                    <th
                      key={day.date}
                      className='p-3 md:p-6 text-center font-black text-white text-sm md:text-base min-w-[120px] md:min-w-[140px] whitespace-nowrap'
                      scope='col'
                    >
                      <div className='flex flex-col items-center justify-center gap-1 md:gap-2'>
                        <div className='text-base md:text-xl font-black tracking-wide uppercase'>{day.dayOfWeek}</div>
                        <div className='bg-white/25 rounded-full py-1 md:py-2 px-2 md:px-4 inline-block text-xs font-bold backdrop-blur-sm shadow-lg ring-1 ring-white/30'>
                          {day.date}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Time slot rows */}
                {dailySlots[0]?.slots.map((slot, timeIndex) => (
                  <tr
                    key={timeIndex}
                    className={
                      slot.type === 'MAINTENANCE'
                        ? 'bg-gradient-to-r from-gray-50 to-slate-50/50'
                        : 'bg-white hover:bg-gradient-to-r hover:from-cyan-50/30 hover:to-transparent transition-all duration-300'
                    }
                  >
                    <td className='border-t border-gray-200 p-3 md:p-6 sticky left-0 z-10 bg-white' scope='row'>
                      <div className='flex items-center gap-2 md:gap-3 flex-wrap'>
                        <div className='text-[#06B6D4] font-black text-sm md:text-base'>{slot.time}</div>
                        {slot.type === 'MAINTENANCE' && (
                          <Tag
                            icon={<ToolOutlined />}
                            color='cyan'
                            className='rounded-full px-4 py-1 font-bold text-xs border-2 border-cyan-500 text-cyan-600 shadow-md bg-white flex items-center gap-1'
                            style={{
                              background: 'linear-gradient(135deg, #06B6D4, #0EA5E9)',
                              color: 'white'
                            }}
                          >
                            maintenance
                          </Tag>
                        )}
                      </div>
                    </td>

                    {dailySlots.map((day) => {
                      const daySlot = day.slots[timeIndex]
                      return (
                        <td key={`${day.date}-${timeIndex}`} className='border-t border-gray-200 p-2 md:p-5'>
                          {daySlot?.type === 'MAINTENANCE' ? (
                            <div className='flex items-center justify-center min-h-[80px] py-6 px-4 rounded-2xl bg-gradient-to-br from-gray-100 to-slate-100 border border-gray-300'>
                              <div className='flex flex-col items-center gap-2'>
                                <div className='bg-white/60 backdrop-blur-sm p-2 rounded-xl'>
                                  <ToolOutlined style={{ fontSize: '20px' }} className='text-slate-700' />
                                </div>
                                <span className='text-xs font-bold text-slate-700'>maintenance</span>
                              </div>
                            </div>
                          ) : (
                            <BookingSlotCell
                              date={day.date}
                              time={daySlot?.time}
                              bookedBy={daySlot?.bookedBy}
                              type={daySlot?.type as SlotType}
                              vehicleId={groupSummary?.vehicleId as number}
                              vehicleStatus={vehicleStatus}
                              quotaUser={quotaUser}
                              bookingId={daySlot?.bookingId ?? undefined}
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>

        {/* Action Section - Flexible Booking Button */}
        <div className='mb-8 flex justify-center'>
          <button
            onClick={() => setIsFlexibleModalVisible(true)}
            className='bg-gradient-to-r from-[#06B6D4] via-[#0EA5E9] to-[#22D3EE] text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-3 text-lg'
          >
            <CalendarOutlined style={{ fontSize: '24px' }} />
            <span>Flexible Booking</span>
          </button>
        </div>

        {/* AI analytics + suggestions - Supporting information */}
        <div className='grid lg:grid-cols-2 gap-6 mb-8'>
          <UsageAnalyticsCard
            data={smartSuggestionQuery?.data?.data?.analytics}
            isLoading={smartSuggestionQuery.isLoading}
          />
          <AISuggestionPanel
            suggestions={smartSuggestionQuery?.data?.data?.suggestions}
            insights={smartSuggestionQuery?.data?.data?.aiInsights}
            isLoading={smartSuggestionQuery.isLoading}
          />
        </div>

        {/* Booking status legend */}
        <DetailStatusBooking />

        {/* Flexible Booking Modal */}
        <FlexibleBookingModal
          visible={isFlexibleModalVisible}
          onClose={() => setIsFlexibleModalVisible(false)}
          onConfirm={handleFlexibleBooking}
          vehicleId={groupSummary?.vehicleId || 0}
          vehicleInfo={{
            brand: groupSummary?.brand,
            model: groupSummary?.model,
            licensePlate: groupSummary?.licensePlate
          }}
          quotaUser={quotaUser}
          isLoading={flexibleBookingMutation.isPending}
        />
      </div>
    </div>
  )
}

export default BookingCar
