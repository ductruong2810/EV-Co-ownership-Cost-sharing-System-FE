import { CalendarOutlined, ClockCircleOutlined, CarOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { Modal, DatePicker, TimePicker, Alert } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useState, useEffect } from 'react'

interface FlexibleBookingModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (data: { startDateTime: string; endDateTime: string }) => void
  vehicleId: number
  vehicleInfo?: {
    brand?: string
    model?: string
    licensePlate?: string
  }
  quotaUser: {
    usedSlots: number
    totalSlots: number
    remainingSlots: number
  }
  isLoading?: boolean
}

const FlexibleBookingModal = ({
  visible,
  onClose,
  onConfirm,
  vehicleId,
  vehicleInfo,
  quotaUser,
  isLoading = false
}: FlexibleBookingModalProps) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs())
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(9).minute(0))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().hour(17).minute(0))
  const [errors, setErrors] = useState<string[]>([])

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      const now = dayjs()
      setStartDate(now)
      setStartTime(now.hour(9).minute(0))
      setEndDate(now)
      setEndTime(now.hour(17).minute(0))
      setErrors([])
    }
  }, [visible])

  // Calculate duration
  const duration = startDate && startTime && endDate && endTime
    ? endDate.hour(endTime.hour()).minute(endTime.minute()).diff(
        startDate.hour(startTime.hour()).minute(startTime.minute()),
        'hour',
        true
      )
    : 0

  // Validate booking
  const validate = (): boolean => {
    const newErrors: string[] = []

    if (!startDate || !startTime) {
      newErrors.push('Vui lòng chọn ngày và giờ bắt đầu')
    }

    if (!endDate || !endTime) {
      newErrors.push('Vui lòng chọn ngày và giờ kết thúc')
    }

    if (startDate && startTime && endDate && endTime) {
      const start = startDate.hour(startTime.hour()).minute(startTime.minute())
      const end = endDate.hour(endTime.hour()).minute(endTime.minute())
      const now = dayjs()

      if (start.isBefore(now)) {
        newErrors.push('Thời gian bắt đầu không được ở quá khứ')
      }

      if (end.isBefore(start) || end.isSame(start)) {
        newErrors.push('Thời gian kết thúc phải sau thời gian bắt đầu')
      }

      if (duration < 1) {
        newErrors.push('Thời lượng booking tối thiểu là 1 giờ')
      }

      if (duration > 24) {
        newErrors.push('Thời lượng booking tối đa là 24 giờ')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleConfirm = () => {
    if (!validate()) return

    if (!startDate || !startTime || !endDate || !endTime) return

    const startDateTime = startDate.hour(startTime.hour()).minute(startTime.minute()).second(0).millisecond(0)
    const endDateTime = endDate.hour(endTime.hour()).minute(endTime.minute()).second(0).millisecond(0)

    onConfirm({
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString()
    })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return `${h} giờ`
    return `${h} giờ ${m} phút`
  }

  return (
    <Modal
      title={
        <div className='flex items-center gap-4'>
          <div className='bg-gradient-to-br from-[#06B6D4] to-[#0EA5E9] p-4 rounded-2xl shadow-xl'>
            <CalendarOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
          <span className='text-3xl font-black text-[#06B6D4] tracking-tight'>Đặt xe linh hoạt</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={
        <div className='flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='bg-gray-100 text-gray-800 font-semibold text-base h-12 px-6 rounded-xl hover:bg-gray-200 transition'
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || errors.length > 0}
            className='bg-gradient-to-br from-[#06B6D4] to-[#0EA5E9] text-white font-bold text-base h-12 px-6 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading ? 'Đang xử lý...' : 'Xác nhận đặt xe'}
          </button>
        </div>
      }
      width={800}
    >
      <div className='space-y-6 py-6'>
        {/* Vehicle Info */}
        {vehicleInfo && (
          <div className='bg-gradient-to-br from-cyan-50 to-blue-50/30 p-6 rounded-2xl border-l-4 border-[#06B6D4] shadow-md ring-1 ring-cyan-100'>
            <div className='flex items-center gap-3 text-[#06B6D4] font-bold text-base mb-2'>
              <CarOutlined /> Thông tin xe
            </div>
            <div className='text-gray-800 font-black text-xl tracking-tight'>
              {vehicleInfo.brand} {vehicleInfo.model} - {vehicleInfo.licensePlate}
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Alert
            message='Lỗi xác thực'
            description={
              <ul className='list-disc list-inside mt-2'>
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            }
            type='error'
            showIcon
            className='rounded-xl'
          />
        )}

        {/* Date and Time Selection */}
        <div className='grid md:grid-cols-2 gap-6'>
          {/* Start Date & Time */}
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-[#06B6D4] font-bold text-lg'>
              <ClockCircleOutlined /> Thời gian bắt đầu
            </div>
            <div className='space-y-3'>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Ngày bắt đầu</label>
                <DatePicker
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date)
                    if (date && endDate && date.isAfter(endDate)) {
                      setEndDate(date)
                    }
                  }}
                  format='DD/MM/YYYY'
                  className='w-full h-12 rounded-xl'
                  disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Giờ bắt đầu</label>
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  format='HH:mm'
                  className='w-full h-12 rounded-xl'
                  minuteStep={15}
                />
              </div>
            </div>
          </div>

          {/* End Date & Time */}
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-[#06B6D4] font-bold text-lg'>
              <CheckCircleOutlined /> Thời gian kết thúc
            </div>
            <div className='space-y-3'>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Ngày kết thúc</label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  format='DD/MM/YYYY'
                  className='w-full h-12 rounded-xl'
                  disabledDate={(current) => {
                    if (!startDate) return current && current.isBefore(dayjs().startOf('day'))
                    return current && current.isBefore(startDate.startOf('day'))
                  }}
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Giờ kết thúc</label>
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  format='HH:mm'
                  className='w-full h-12 rounded-xl'
                  minuteStep={15}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Duration & Summary */}
        <div className='bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200'>
          <div className='grid md:grid-cols-3 gap-4'>
            <div>
              <p className='text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1'>Thời lượng</p>
              <p className='text-2xl font-black text-slate-900'>{formatDuration(duration)}</p>
            </div>
            <div>
              <p className='text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1'>Quota sau khi đặt</p>
              <p className='text-2xl font-black text-slate-900'>
                {quotaUser.usedSlots + 1}/{quotaUser.totalSlots}
              </p>
            </div>
            <div>
              <p className='text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1'>Còn lại</p>
              <p className='text-2xl font-black text-slate-900'>{quotaUser.remainingSlots - 1} slot</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='flex flex-wrap gap-2'>
          <button
            onClick={() => {
              const now = dayjs()
              setStartDate(now)
              setStartTime(now.hour(9).minute(0))
              setEndDate(now)
              setEndTime(now.hour(17).minute(0))
            }}
            className='px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-semibold hover:bg-cyan-200 transition'
          >
            Hôm nay (9:00 - 17:00)
          </button>
          <button
            onClick={() => {
              const tomorrow = dayjs().add(1, 'day')
              setStartDate(tomorrow)
              setStartTime(tomorrow.hour(9).minute(0))
              setEndDate(tomorrow)
              setEndTime(tomorrow.hour(17).minute(0))
            }}
            className='px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-semibold hover:bg-cyan-200 transition'
          >
            Ngày mai (9:00 - 17:00)
          </button>
          <button
            onClick={() => {
              const now = dayjs()
              setStartDate(now)
              setStartTime(now.hour(18).minute(0))
              setEndDate(now.add(1, 'day'))
              setEndTime(now.hour(9).minute(0))
            }}
            className='px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-semibold hover:bg-cyan-200 transition'
          >
            Qua đêm (18:00 - 9:00+1)
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default FlexibleBookingModal

