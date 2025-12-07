import { CalendarOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { Card } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import groupApi from '../../../../../../apis/group.api'
import BookingSlotCell from '../BookingSlotCell'

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

interface MonthViewCalendarProps {
  dailySlots: Array<{
    date: string
    dayOfWeek: string
    slots: Array<{
      time: string
      status: string
      bookedBy: string | null
      bookable: boolean
      type: SlotType
      bookingId: number | null
    }>
  }>
  vehicleId: number
  vehicleStatus: string
  quotaUser: {
    usedSlots: number
    totalSlots: number
    remainingSlots: number
  }
  groupSummary?: {
    vehicleId?: number
    brand?: string
    model?: string
    licensePlate?: string
  }
  onSlotClick?: (date: string, time: string) => void
  selectedRange?: { start: string; end: string } | null
}

const MonthViewCalendar = ({
  dailySlots,
  vehicleId,
  vehicleStatus,
  quotaUser,
  groupSummary,
  onSlotClick,
  selectedRange
}: MonthViewCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs())
  const queryClient = useQueryClient()

  // Group slots by date for month view
  const slotsByDate = useMemo(() => {
    const map = new Map<string, typeof dailySlots[0]['slots']>()
    dailySlots.forEach((day) => {
      map.set(day.date, day.slots)
    })
    return map
  }, [dailySlots])

  // Get all days in current month
  const monthDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month')
    const endOfMonth = currentMonth.endOf('month')
    const startDate = startOfMonth.startOf('week') // Start from Sunday
    const endDate = endOfMonth.endOf('week') // End on Saturday

    const days: Array<{ date: Dayjs; isCurrentMonth: boolean; dateStr: string }> = []
    let current = startDate

    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      days.push({
        date: current,
        isCurrentMonth: current.month() === currentMonth.month(),
        dateStr: current.format('YYYY-MM-DD')
      })
      current = current.add(1, 'day')
    }

    return days
  }, [currentMonth])

  // Get time slots from first day (assuming all days have same time slots)
  const timeSlots = dailySlots[0]?.slots || []

  // Navigate months
  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'))
  const goToToday = () => setCurrentMonth(dayjs())

  // Check if date is in selected range
  const isInSelectedRange = (dateStr: string) => {
    if (!selectedRange) return false
    const date = dayjs(dateStr)
    const start = dayjs(selectedRange.start)
    const end = dayjs(selectedRange.end)
    return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day')
  }

  // Check if date is today
  const isToday = (date: Dayjs) => date.isSame(dayjs(), 'day')

  return (
    <div className='space-y-4'>
      {/* Month Navigation */}
      <div className='flex items-center justify-between bg-white rounded-xl p-4 shadow-md border border-cyan-100'>
        <button
          onClick={prevMonth}
          className='px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition font-semibold'
        >
          ← Tháng trước
        </button>
        <div className='text-center'>
          <h3 className='text-2xl font-black text-cyan-600'>{currentMonth.format('MMMM YYYY')}</h3>
          <button
            onClick={goToToday}
            className='text-sm text-gray-600 hover:text-cyan-600 transition mt-1'
          >
            Về hôm nay
          </button>
        </div>
        <button
          onClick={nextMonth}
          className='px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition font-semibold'
        >
          Tháng sau →
        </button>
      </div>

      {/* Calendar Grid */}
      <Card className='shadow-xl border-0 rounded-3xl overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse min-w-[1200px]'>
            <thead>
              <tr className='bg-gradient-to-r from-[#06B6D4] via-[#0EA5E9] to-[#22D3EE]'>
                <th className='p-4 text-left font-black text-white text-sm w-32 sticky left-0 z-10 bg-[#06B6D4]'>
                  <div className='flex items-center gap-2'>
                    <CalendarOutlined />
                    <span>Thời gian</span>
                  </div>
                </th>
                {monthDays.map((day, idx) => (
                  <th
                    key={idx}
                    className={`p-3 text-center font-black text-white text-xs min-w-[100px] ${
                      !day.isCurrentMonth ? 'opacity-50' : ''
                    } ${isToday(day.date) ? 'bg-cyan-600' : ''}`}
                  >
                    <div className='flex flex-col items-center gap-1'>
                      <div className='text-xs font-semibold'>{day.date.format('ddd')}</div>
                      <div
                        className={`text-lg font-black rounded-full w-8 h-8 flex items-center justify-center ${
                          isToday(day.date)
                            ? 'bg-white text-cyan-600'
                            : isInSelectedRange(day.dateStr)
                              ? 'bg-yellow-400 text-yellow-900'
                              : 'bg-white/25 text-white'
                        }`}
                      >
                        {day.date.format('D')}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, timeIndex) => (
                <tr
                  key={timeIndex}
                  className='bg-white hover:bg-cyan-50/30 transition-all duration-300'
                >
                  <td className='border-t border-gray-200 p-3 sticky left-0 z-10 bg-white'>
                    <div className='text-cyan-600 font-black text-sm'>{slot.time}</div>
                  </td>
                  {monthDays.map((day, dayIndex) => {
                    const daySlots = slotsByDate.get(day.dateStr)
                    const daySlot = daySlots?.[timeIndex]
                    const slotKey = `${day.dateStr}-${slot.time}`
                    const isSelected = selectedRange && isInSelectedRange(day.dateStr)

                    return (
                      <td
                        key={dayIndex}
                        className={`border-t border-gray-200 p-2 ${
                          !day.isCurrentMonth ? 'opacity-30 bg-gray-50' : ''
                        } ${isSelected ? 'bg-yellow-50 ring-2 ring-yellow-400' : ''}`}
                      >
                        {daySlot ? (
                          daySlot.type === 'MAINTENANCE' ? (
                            <div className='flex items-center justify-center min-h-[60px] py-3 px-2 rounded-xl bg-gradient-to-br from-gray-100 to-slate-100 border border-gray-300'>
                              <ToolOutlined className='text-slate-700' />
                            </div>
                          ) : (
                            <div className='relative'>
                              <BookingSlotCell
                                date={day.dateStr}
                                time={daySlot.time}
                                bookedBy={daySlot.bookedBy}
                                type={daySlot.type as SlotType}
                                vehicleId={vehicleId}
                                vehicleStatus={vehicleStatus}
                                quotaUser={quotaUser}
                                bookingId={daySlot.bookingId ?? undefined}
                              />
                            </div>
                          )
                        ) : (
                          <div className='min-h-[60px] flex items-center justify-center text-gray-300 text-xs'>
                            -
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
    </div>
  )
}

export default MonthViewCalendar

