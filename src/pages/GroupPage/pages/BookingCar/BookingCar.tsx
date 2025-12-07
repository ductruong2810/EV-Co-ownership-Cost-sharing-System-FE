// VehicleBookingCalendar.tsx - IMPROVED BADGE & LEGEND DESIGN
import { ClockCircleOutlined, ToolOutlined, LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useContext, useEffect, useState, useMemo } from 'react'
import { Card, Tag, Button } from 'antd'
import { useParams } from 'react-router-dom'
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
import MonthViewCalendar from './components/MonthViewCalendar'
import RangeSelector from './components/RangeSelector'
import { AppContext } from '../../../../contexts/app.context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useI18n } from '../../../../i18n/useI18n'

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
  const { t } = useI18n()
  const { groupId } = useParams<{ groupId: string }>()
  const { setGroupId, subscribeGroupNotifications, unsubscribeGroupNotifications } = useContext(AppContext)
  
  // Week navigation state - tính toán tuần hiện tại (thứ 2 đầu tuần)
  const getCurrentWeekStart = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null)
  const currentWeekStart = useMemo(() => getCurrentWeekStart(), [])

  useEffect(() => {
    if (!groupId) return
    setGroupId(groupId)
    setGroupIdToLS(groupId)
    subscribeGroupNotifications(groupId)

    return () => {
      unsubscribeGroupNotifications(groupId)
    }
  }, [groupId, setGroupId, subscribeGroupNotifications, unsubscribeGroupNotifications])
  
  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = selectedWeekStart || currentWeekStart
    const date = new Date(current)
    date.setDate(date.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedWeekStart(date.toISOString().split('T')[0])
  }

  const goToCurrentWeek = () => {
    setSelectedWeekStart(null)
  }

  const bookingQuery = useQuery({
    queryKey: ['vehicle-bookings', groupId, selectedWeekStart],
    queryFn: () => {
      const params = selectedWeekStart ? { weekStart: selectedWeekStart } : undefined
      return groupApi.getBookingCalendar(groupId as string, params)
    },
    enabled: !!groupId
  })

  const smartSuggestionQuery = useQuery({
    queryKey: ['smart-suggestions', groupId],
    queryFn: () => groupApi.getSmartSuggestions(groupId as string),
    enabled: !!groupId
  })

  // data
  const data = bookingQuery?.data?.data

  // quota
  const quotaUser: QuotaInfo = {
    totalSlots: bookingQuery?.data?.data?.userQuota?.totalSlots ?? 0,
    usedSlots: bookingQuery?.data?.data?.userQuota?.usedSlots ?? 0,
    remainingSlots: bookingQuery?.data?.data?.userQuota?.remainingSlots ?? 0
  }
  const dailySlots: DailySlot[] =
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
  console.log(bookingQuery?.data?.data)

  // groupSummary
  const groupSummary = bookingQuery?.data?.data?.dashboardSummary

  const vehicleStatus = bookingQuery?.data?.data?.dashboardSummary?.vehicleStatus || ''

  // Map AI suggestions to slots for highlighting
  const aiSuggestionsMap = useMemo(() => {
    const map = new Map<string, { recommendationLevel: string; score: number }>()
    smartSuggestionQuery?.data?.data?.suggestions?.forEach((suggestion) => {
      const key = `${suggestion.date}-${suggestion.timeRange}`
      map.set(key, {
        recommendationLevel: suggestion.recommendationLevel,
        score: suggestion.score
      })
    })
    return map
  }, [smartSuggestionQuery?.data?.data?.suggestions])

  // Highlight slot when clicking AI suggestion
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null)

  // Calendar view state (week or month)
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week')

  // Range selection state
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)
  const [showRangeSelector, setShowRangeSelector] = useState(false)

  // Detect conflicts in selected range
  const conflicts = useMemo(() => {
    if (!selectedRange) return []
    const conflictsList: Array<{ date: string; time: string; bookedBy: string }> = []
    const start = dayjs(selectedRange.start)
    const end = dayjs(selectedRange.end)

    dailySlots.forEach((day) => {
      const dayDate = dayjs(day.date)
      if (dayDate.isSameOrAfter(start, 'day') && dayDate.isSameOrBefore(end, 'day')) {
        day.slots.forEach((slot) => {
          if (slot.type === 'BOOKED_OTHER' || slot.type === 'BOOKED_SELF') {
            conflictsList.push({
              date: day.date,
              time: slot.time,
              bookedBy: slot.bookedBy || 'Unknown'
            })
          }
        })
      }
    })

    return conflictsList
  }, [selectedRange, dailySlots])

  // Flexible booking modal state
  const [isFlexibleModalVisible, setIsFlexibleModalVisible] = useState(false)
  const queryClient = useQueryClient()

  // Flexible booking mutation
  const flexibleBookingMutation = useMutation({
    mutationFn: (body: { vehicleId: number; startDateTime: string; endDateTime: string }) =>
      groupApi.bookingSlot(body),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['smart-suggestions', groupId] })
      toast.success(response?.data?.message || t('gp_booking_success'))
      setIsFlexibleModalVisible(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('gp_booking_error'))
    }
  })

  const handleFlexibleBooking = (data: { startDateTime: string; endDateTime: string }) => {
    if (!groupSummary?.vehicleId) {
      toast.error(t('gp_booking_error'))
      return
    }

    if (quotaUser.remainingSlots <= 0) {
      toast.error(t('gp_booking_error'))
      return
    }

    if (vehicleStatus === 'Has Issues') {
      toast.error(t('gp_booking_error'))
      return
    }

    if (vehicleStatus === 'Under Maintenance') {
      toast.warning(t('gp_booking_error'))
      return
    }

    flexibleBookingMutation.mutate({
      vehicleId: groupSummary.vehicleId,
      ...data
    })
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40 p-8 my-5 rounded-2xl'>
      <div className='max-w-[96vw] mx-auto'>
        {/* Header Section - giữ nguyên như code trước */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8'>
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

        {/* Range Selector */}
        {showRangeSelector && (
          <RangeSelector
            onRangeSelected={(start, end) => {
              setSelectedRange({ start, end })
              setShowRangeSelector(false)
            }}
            vehicleId={groupSummary?.vehicleId || 0}
            vehicleInfo={{
              brand: groupSummary?.brand,
              model: groupSummary?.model,
              licensePlate: groupSummary?.licensePlate
            }}
            quotaUser={quotaUser}
            conflicts={conflicts}
          />
        )}

        {/* Conflict Alert */}
        {selectedRange && conflicts.length > 0 && (
          <div className='mb-6'>
            <Alert
              message={t('gp_booking_conflict_detected')}
              description={t('gp_booking_conflict_message', { count: conflicts.length })}
              type='warning'
              showIcon
              closable
              onClose={() => setSelectedRange(null)}
              className='rounded-xl'
            />
          </div>
        )}

        {/* AI analytics + suggestions */}
        <div className='grid lg:grid-cols-2 gap-6 mb-8'>
          <UsageAnalyticsCard
            data={smartSuggestionQuery?.data?.data?.analytics}
            isLoading={smartSuggestionQuery.isLoading}
          />
          <AISuggestionPanel
            suggestions={smartSuggestionQuery?.data?.data?.suggestions}
            insights={smartSuggestionQuery?.data?.data?.aiInsights}
            isLoading={smartSuggestionQuery.isLoading}
            onSuggestionClick={(date, timeRange) => {
              setHighlightedSlot(`${date}-${timeRange}`)
              // Scroll to calendar
              setTimeout(() => {
                const calendarElement = document.querySelector('.calendar-container')
                calendarElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}
          />
        </div>

        {/* Week Navigation & Flexible Booking */}
        <div className='mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl p-4 shadow-lg border border-cyan-100'>
          <div className='flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start flex-wrap'>
            {/* View Toggle */}
            <div className='flex items-center gap-2 bg-gray-100 rounded-lg p-1'>
              <button
                onClick={() => setCalendarView('week')}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                  calendarView === 'week'
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-cyan-600'
                }`}
              >
                <UnorderedListOutlined className='mr-1' />
                {t('gp_booking_week')}
              </button>
              <button
                onClick={() => setCalendarView('month')}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                  calendarView === 'month'
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-cyan-600'
                }`}
              >
                <AppstoreOutlined className='mr-1' />
                {t('gp_booking_month')}
              </button>
            </div>
            <Button
              icon={<LeftOutlined />}
              onClick={() => navigateWeek('prev')}
              className='flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 hover:from-cyan-600 hover:to-blue-600 shadow-md text-xs sm:text-sm'
            >
              <span className='hidden sm:inline'>{t('gp_booking_prev_week')}</span>
              <span className='sm:hidden'>{t('gp_booking_prev_week').split(' ')[0]}</span>
            </Button>
            <Button
              icon={<CalendarOutlined />}
              onClick={goToCurrentWeek}
              className='px-3 sm:px-4 py-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 text-xs sm:text-sm'
              disabled={!selectedWeekStart}
            >
              <span className='hidden sm:inline'>{t('gp_booking_current_week')}</span>
              <span className='sm:hidden'>{t('gp_booking_today')}</span>
            </Button>
            <Button
              icon={<RightOutlined />}
              onClick={() => navigateWeek('next')}
              className='flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 hover:from-cyan-600 hover:to-blue-600 shadow-md text-xs sm:text-sm'
            >
              <span className='hidden sm:inline'>{t('gp_booking_next_week')}</span>
              <span className='sm:hidden'>{t('gp_booking_next_week').split(' ')[0]}</span>
            </Button>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => setIsFlexibleModalVisible(true)}
              className='flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 hover:from-emerald-600 hover:to-teal-600 shadow-md text-xs sm:text-sm font-bold'
            >
              <span className='hidden sm:inline'>{t('gp_booking_flexible')}</span>
              <span className='sm:hidden'>{t('gp_booking_flexible').split(' ')[0]}</span>
            </Button>
            <Button
              onClick={() => setShowRangeSelector(!showRangeSelector)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border-2 text-xs sm:text-sm font-bold transition-all ${
                showRangeSelector
                  ? 'bg-cyan-500 border-cyan-500 text-white'
                  : 'border-cyan-500 text-cyan-600 hover:bg-cyan-50'
              }`}
            >
              <CalendarOutlined />
              <span className='hidden sm:inline'>{t('gp_booking_select_range')}</span>
              <span className='sm:hidden'>{t('gp_booking_range')}</span>
            </Button>
          </div>
          <div className='text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-right'>
            {data?.weekStart && data?.weekEnd ? (
              <span>
                {data.weekStart} - {data.weekEnd}
              </span>
            ) : (
              <span>{t('gp_booking_loading')}</span>
            )}
          </div>
        </div>

        {/* hiển thị lịch  đặt xe */}
        {calendarView === 'week' ? (
          <Card className='shadow-2xl border-0 rounded-3xl overflow-hidden mb-8 hover:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] transition-all duration-500 bg-white calendar-container'>
            <div className='overflow-x-auto scrollbar-hide'>
            {/* Chỉ render 1 bảng duy nhất, không map dailySlots nữa */}
            <table className='w-full border-collapse min-w-[800px]'>
              <thead>
                <tr className='bg-gradient-to-r from-[#06B6D4] via-[#0EA5E9] to-[#22D3EE]'>
                  <th className='p-3 sm:p-6 text-left font-black text-white text-sm sm:text-lg w-40 sm:w-56 sticky left-0 z-10 bg-[#06B6D4]'>
                    <div className='flex items-center gap-2 sm:gap-3'>
                      <ClockCircleOutlined style={{ fontSize: '18px' }} className='sm:text-[22px]' />
                      <span className='uppercase tracking-wide text-xs sm:text-base'>{t('gp_booking_time_slot')}</span>
                    </div>
                  </th>

                  {dailySlots.map((day) => (
                    <th
                      key={day.date}
                      className='p-3 sm:p-6 text-center font-black text-white text-xs sm:text-base min-w-[120px] sm:min-w-[140px] whitespace-nowrap'
                    >
                      <div className='flex flex-col items-center justify-center gap-1 sm:gap-2'>
                        <div className='text-sm sm:text-xl font-black tracking-wide uppercase'>{day.dayOfWeek}</div>
                        <div className='bg-white/25 rounded-full py-1 sm:py-2 px-2 sm:px-4 inline-block text-xs font-bold backdrop-blur-sm shadow-lg ring-1 ring-white/30'>
                          {day.date}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/*  hiển thị cột khung giờ */}
                {dailySlots[0]?.slots.map((slot, timeIndex) => (
                  <tr
                    key={timeIndex}
                    className={
                      slot.type === 'MAINTENANCE'
                        ? 'bg-gradient-to-r from-gray-50 to-slate-50/50'
                        : 'bg-white hover:bg-gradient-to-r hover:from-cyan-50/30 hover:to-transparent transition-all duration-300'
                    }
                  >
                    <td className='border-t border-gray-200 p-3 sm:p-6 sticky left-0 z-10 bg-white'>
                      <div className='flex items-center gap-2 sm:gap-3 flex-wrap'>
                        <div className='text-[#06B6D4] font-black text-xs sm:text-base'>{slot.time}</div>
                        {slot.type === 'MAINTENANCE' && (
                          <Tag
                            icon={<ToolOutlined />}
                            color='cyan'
                            className='rounded-full px-2 sm:px-4 py-0.5 sm:py-1 font-bold text-xs border-2 border-cyan-500 text-cyan-600 shadow-md bg-white flex items-center gap-1'
                            style={{
                              background: 'linear-gradient(135deg, #06B6D4, #0EA5E9)',
                              color: 'white'
                            }}
                          >
                            <span className='hidden sm:inline'>maintenance</span>
                            <span className='sm:hidden'>Maint</span>
                          </Tag>
                        )}
                      </div>
                    </td>

                    {dailySlots.map((day) => {
                      const daySlot = day.slots[timeIndex]
                      const slotKey = `${day.date}-${daySlot?.time}`
                      const isHighlighted = highlightedSlot === slotKey
                      const aiSuggestion = aiSuggestionsMap.get(slotKey)
                      return (
                        <td
                          key={`${day.date}-${timeIndex}`}
                          className={`border-t border-gray-200 p-2 sm:p-5 ${isHighlighted ? 'bg-yellow-100 ring-4 ring-yellow-400 ring-opacity-50' : ''} transition-all duration-300`}
                        >
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
                            <div className='relative'>
                              {aiSuggestion && daySlot?.type === 'AVAILABLE' && (
                                <div
                                  className={`absolute -top-2 -right-2 z-20 px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                    aiSuggestion.recommendationLevel === 'HIGH'
                                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                                      : aiSuggestion.recommendationLevel === 'MEDIUM'
                                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                                        : 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800'
                                  }`}
                                  title={`AI Recommendation: ${aiSuggestion.recommendationLevel} (Score: ${aiSuggestion.score.toFixed(0)})`}
                                >
                                  ⭐ {aiSuggestion.recommendationLevel}
                                </div>
                              )}
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
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        ) : (
          <div className='mb-8 calendar-container'>
            <MonthViewCalendar
              dailySlots={dailySlots}
              vehicleId={groupSummary?.vehicleId || 0}
              vehicleStatus={vehicleStatus}
              quotaUser={quotaUser}
              groupSummary={groupSummary}
              selectedRange={selectedRange}
              onSlotClick={(date, time) => {
                setHighlightedSlot(`${date}-${time}`)
              }}
            />
          </div>
        )}

        {/* mô tả các trang thái khi booking*/}
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
