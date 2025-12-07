import { Alert, Button } from 'antd'
import { CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useState } from 'react'
import FlexibleBookingModal from '../FlexibleBookingModal'

interface RangeSelectorProps {
  onRangeSelected: (start: string, end: string) => void
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
  conflicts?: Array<{ date: string; time: string; bookedBy: string }>
}

const RangeSelector = ({
  onRangeSelected,
  vehicleId,
  vehicleInfo,
  quotaUser,
  conflicts = []
}: RangeSelectorProps) => {
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endTime, setEndTime] = useState<string>('17:00')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const queryClient = useQueryClient()

  const bookingMutation = useMutation({
    mutationFn: (body: { vehicleId: number; startDateTime: string; endDateTime: string }) =>
      groupApi.bookingSlot(body),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['smart-suggestions'] })
      toast.success(response?.data?.message || 'Đặt xe thành công!')
      setIsModalVisible(false)
      setStartDate(null)
      setEndDate(null)
      onRangeSelected('', '') // Clear selection
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Đặt xe thất bại. Vui lòng thử lại!')
    }
  })

  const handleConfirm = () => {
    if (!startDate || !endDate) return

    const start = dayjs(`${startDate} ${startTime}`).toISOString()
    const end = dayjs(`${endDate} ${endTime}`).toISOString()

    setIsModalVisible(true)
  }

  const handleFlexibleBooking = (data: { startDateTime: string; endDateTime: string }) => {
    bookingMutation.mutate({
      vehicleId,
      ...data
    })
  }

  const hasSelection = startDate && endDate
  const hasConflicts = conflicts.length > 0

  return (
    <>
      <div className='bg-white rounded-2xl p-6 shadow-lg border border-cyan-100 mb-6'>
        <div className='flex items-center gap-3 mb-4'>
          <CalendarOutlined className='text-cyan-600 text-xl' />
          <h3 className='text-xl font-black text-cyan-600'>Chọn khoảng thời gian</h3>
        </div>

        <div className='grid md:grid-cols-2 gap-4 mb-4'>
          <div>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>Ngày bắt đầu</label>
            <input
              type='date'
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value)}
              min={dayjs().format('YYYY-MM-DD')}
              className='w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
            />
          </div>
          <div>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>Ngày kết thúc</label>
            <input
              type='date'
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || dayjs().format('YYYY-MM-DD')}
              className='w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
            />
          </div>
        </div>

        <div className='grid md:grid-cols-2 gap-4 mb-4'>
          <div>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>Giờ bắt đầu</label>
            <input
              type='time'
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
            />
          </div>
          <div>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>Giờ kết thúc</label>
            <input
              type='time'
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
            />
          </div>
        </div>

        {hasConflicts && (
          <Alert
            message='Cảnh báo xung đột'
            description={
              <div className='mt-2'>
                <p className='text-sm mb-2'>Có {conflicts.length} slot đã được đặt trong khoảng thời gian này:</p>
                <ul className='list-disc list-inside text-sm space-y-1'>
                  {conflicts.slice(0, 5).map((conflict, idx) => (
                    <li key={idx}>
                      {conflict.date} {conflict.time} - {conflict.bookedBy}
                    </li>
                  ))}
                  {conflicts.length > 5 && <li>... và {conflicts.length - 5} slot khác</li>}
                </ul>
              </div>
            }
            type='warning'
            showIcon
            className='mb-4 rounded-xl'
          />
        )}

        <div className='flex items-center gap-3'>
          <Button
            type='primary'
            icon={<CheckCircleOutlined />}
            onClick={handleConfirm}
            disabled={!hasSelection || bookingMutation.isPending}
            loading={bookingMutation.isPending}
            className='bg-gradient-to-r from-cyan-500 to-blue-500 border-0 hover:from-cyan-600 hover:to-blue-600'
            size='large'
          >
            {bookingMutation.isPending ? 'Đang xử lý...' : 'Xác nhận đặt xe'}
          </Button>
          {(startDate || endDate) && (
            <Button
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setStartDate(null)
                setEndDate(null)
              }}
              size='large'
            >
              Xóa lựa chọn
            </Button>
          )}
        </div>

        {hasSelection && (
          <div className='mt-4 p-4 bg-cyan-50 rounded-xl border border-cyan-200'>
            <p className='text-sm font-semibold text-cyan-700 mb-1'>Thời gian đã chọn:</p>
            <p className='text-lg font-black text-cyan-900'>
              {dayjs(startDate).format('DD/MM/YYYY')} {startTime} - {dayjs(endDate).format('DD/MM/YYYY')} {endTime}
            </p>
            <p className='text-sm text-cyan-600 mt-1'>
              Thời lượng: {dayjs(`${endDate} ${endTime}`).diff(dayjs(`${startDate} ${startTime}`), 'hour', true).toFixed(1)} giờ
            </p>
          </div>
        )}
      </div>

      <FlexibleBookingModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleFlexibleBooking}
        vehicleId={vehicleId}
        vehicleInfo={vehicleInfo}
        quotaUser={quotaUser}
      />
    </>
  )
}

export default RangeSelector

