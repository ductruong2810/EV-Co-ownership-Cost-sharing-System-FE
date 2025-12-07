import { CalendarOutlined, ClockCircleOutlined, ThunderboltOutlined, BulbOutlined, EyeOutlined } from '@ant-design/icons'
import { Card, Button } from 'antd'
import { useI18n } from '../../../../../../i18n/useI18n'

interface QuickBookingPanelProps {
  onFlexibleBooking: () => void
  onRangeSelector: () => void
  onShowCalendar: () => void
  vehicleInfo?: {
    brand?: string
    model?: string
    licensePlate?: string
  }
}

const QuickBookingPanel = ({
  onFlexibleBooking,
  onRangeSelector,
  onShowCalendar,
  vehicleInfo
}: QuickBookingPanelProps) => {
  const { t } = useI18n()

  const quickActions = [
    {
      icon: <ThunderboltOutlined />,
      title: t('gp_booking_quick_today') || 'Hôm nay (9:00 - 17:00)',
      description: t('gp_booking_quick_today_desc'),
      onClick: () => {
        // Pre-fill và mở flexible booking modal với hôm nay
        onFlexibleBooking()
      },
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: <CalendarOutlined />,
      title: t('gp_booking_quick_tomorrow') || 'Ngày mai (9:00 - 17:00)',
      description: t('gp_booking_quick_tomorrow_desc'),
      onClick: () => {
        onFlexibleBooking()
      },
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: <ClockCircleOutlined />,
      title: t('gp_booking_quick_overnight') || 'Qua đêm (18:00 - 9:00+1)',
      description: t('gp_booking_quick_overnight_desc'),
      onClick: () => {
        onFlexibleBooking()
      },
      color: 'from-purple-500 to-pink-500'
    }
  ]

  return (
    <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
      {/* Quick Actions */}
      <div className='md:col-span-2 lg:col-span-3'>
        <Card className='shadow-xl border-0 rounded-3xl overflow-hidden bg-gradient-to-br from-white to-cyan-50/20 border border-cyan-100'>
          <div className='p-6'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='bg-gradient-to-br from-cyan-500 to-blue-500 p-3 rounded-xl shadow-lg'>
                <ThunderboltOutlined style={{ fontSize: '24px', color: 'white' }} />
              </div>
              <div>
                <h3 className='text-xl font-black text-cyan-800'>{t('gp_booking_quick_actions_title')}</h3>
                <p className='text-sm text-cyan-600'>{t('gp_booking_quick_actions_desc')}</p>
              </div>
            </div>
            <div className='grid sm:grid-cols-3 gap-4'>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`bg-gradient-to-r ${action.color} text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 text-left`}
                >
                  <div className='mb-3'>{action.icon}</div>
                  <div className='font-bold text-lg mb-1'>{action.title}</div>
                  <div className='text-sm text-white/90'>{action.description}</div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Flexible Booking Card */}
      <Card className='shadow-xl border-0 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-200 hover:shadow-2xl transition-all duration-300'>
        <div className='p-6 h-full flex flex-col'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='bg-gradient-to-br from-emerald-500 to-teal-500 p-3 rounded-xl shadow-lg'>
              <CalendarOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
            <div>
              <h3 className='text-lg font-black text-emerald-800'>{t('gp_booking_flexible_title')}</h3>
            </div>
          </div>
          <p className='text-emerald-700 text-sm mb-6 flex-1'>
            {t('gp_booking_flexible_desc')}
          </p>
          <Button
            icon={<CalendarOutlined />}
            onClick={onFlexibleBooking}
            className='w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 hover:from-emerald-600 hover:to-teal-600 shadow-lg'
            size='large'
          >
            {t('gp_booking_flexible') || 'Đặt linh hoạt'}
          </Button>
        </div>
      </Card>

      {/* Range Selector Card */}
      <Card className='shadow-xl border-0 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-200 hover:shadow-2xl transition-all duration-300'>
        <div className='p-6 h-full flex flex-col'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='bg-gradient-to-br from-blue-500 to-indigo-500 p-3 rounded-xl shadow-lg'>
              <ClockCircleOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
            <div>
              <h3 className='text-lg font-black text-blue-800'>{t('gp_booking_range_title')}</h3>
            </div>
          </div>
          <p className='text-blue-700 text-sm mb-6 flex-1'>
            {t('gp_booking_range_desc')}
          </p>
          <Button
            icon={<ClockCircleOutlined />}
            onClick={onRangeSelector}
            className='w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600 shadow-lg'
            size='large'
          >
            {t('gp_booking_select_range') || 'Chọn khoảng'}
          </Button>
        </div>
      </Card>

      {/* Show Calendar Card */}
      <Card className='shadow-xl border-0 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-gray-50/30 border border-slate-200 hover:shadow-2xl transition-all duration-300'>
        <div className='p-6 h-full flex flex-col'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='bg-gradient-to-br from-slate-500 to-gray-500 p-3 rounded-xl shadow-lg'>
              <BulbOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
            <div>
              <h3 className='text-lg font-black text-slate-800'>{t('gp_booking_slot_calendar_title')}</h3>
            </div>
          </div>
          <p className='text-slate-700 text-sm mb-6 flex-1'>
            {t('gp_booking_slot_calendar_desc')}
          </p>
          <Button
            icon={<EyeOutlined />}
            onClick={onShowCalendar}
            className='w-full bg-gradient-to-r from-slate-500 to-gray-500 text-white border-0 hover:from-slate-600 hover:to-gray-600 shadow-lg'
            size='large'
          >
            {t('gp_booking_show_calendar') || 'Hiện lịch slot'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default QuickBookingPanel

