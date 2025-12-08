import { Card, Tag } from 'antd'

import { DashboardOutlined, ThunderboltOutlined } from '@ant-design/icons'
import getConditionConfig from '../BookingSlotCell/utils/getConditionconfig'
import { useI18n } from '../../../../../../i18n/useI18n'

interface statusCardProps {
  vehicleStatus: 'Good' | 'Under Maintenance' | 'Has Issues' | ''
  batteryPercent: number | null
  odometer: number | null
}
export default function StatusCard({ vehicleStatus, batteryPercent, odometer }: statusCardProps) {
  const { t } = useI18n()

  const badge = (() => {
    switch (vehicleStatus) {
      case 'Good':
        return { color: 'green', text: t('gp_status_good') }
      case 'Under Maintenance':
        return { color: 'orange', text: t('gp_status_maintenance') }
      case 'Has Issues':
        return { color: 'red', text: t('gp_status_issue') }
      default:
        return { color: 'blue', text: t('gp_status_unknown') }
    }
  })()

  return (
    <>
      <Card
        className='shadow-xl border-0 rounded-3xl overflow-hidden hover:shadow-[0_16px_45px_-12px_rgba(6,182,212,0.35)] transition-all duration-400 hover:-translate-y-1.5 bg-gradient-to-br from-white to-cyan-50/20'
        bodyStyle={{ padding: 0, height: '100%' }}
      >
        <div
          className={`bg-gradient-to-br ${
            getConditionConfig({
              vehicleStatus: vehicleStatus || 'Good'
            }).bgColor
          } p-5 sm:p-6 h-full relative overflow-hidden`}
        >
          <div className='absolute inset-0 bg-white/5'></div>
          <div className='absolute bottom-0 right-0 w-28 h-28 bg-white/12 rounded-full blur-3xl'></div>
          <div className='relative z-10 flex flex-col justify-between h-full min-h-[220px]'>
            <div className='flex items-start justify-between mb-3'>
              <div className='flex items-start gap-3'>
                <div className='bg-white/25 backdrop-blur-xl p-3 rounded-2xl shadow-lg ring-1 ring-white/30'>
                  {
                    getConditionConfig({
                      vehicleStatus: vehicleStatus
                    }).icon
                  }
                </div>
                <div>
                  <div className='text-white/95 text-sm sm:text-base font-bold uppercase tracking-wide'>{t('gp_status_title')}</div>
                </div>
              </div>
              <Tag color={badge.color} className='font-semibold px-3 py-1 rounded-full border-0 bg-white/25 text-white text-xs sm:text-sm'>
                {badge.text}
              </Tag>
            </div>

            <div className='flex-1 flex flex-col justify-center space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <ThunderboltOutlined style={{ fontSize: '24px', color: 'white' }} />
                  <span className='text-white text-sm sm:text-base font-semibold'>{t('gp_status_battery')}</span>
                </div>
                <div className='text-white text-xl sm:text-2xl font-black drop-shadow-[0_3px_8px_rgba(0,0,0,0.2)]'>{batteryPercent}%</div>
              </div>
            </div>

            <div className='flex justify-center'>
              <div className='bg-white/18 backdrop-blur-md rounded-2xl px-5 py-4 text-center shadow-lg ring-1 ring-white/25 hover:bg-white/24 transition-all w-[150px]'>
                <DashboardOutlined style={{ fontSize: '22px', color: 'white' }} />
                <div className='text-white text-base sm:text-lg font-black mt-1 leading-tight'>{odometer}</div>
                <div className='text-white/90 text-xs font-bold uppercase'>{t('gp_status_odometer')}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}
