import { LoadingOutlined } from '@ant-design/icons'
import type { UsageAnalytics } from '../../../../../types/api/group.type'
import { useI18n } from '../../../../../i18n/useI18n'

interface UsageAnalyticsCardProps {
  data?: UsageAnalytics
  isLoading: boolean
}

const UsageAnalyticsCard = ({ data, isLoading }: UsageAnalyticsCardProps) => {
  const { t } = useI18n()

  const statusConfig: Record<
    string,
    { label: string; badge: string; description: string }
  > = {
    UNDER_UTILIZED: {
      label: t('gp_booking_analytics_under_utilized'),
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      description: t('gp_booking_analytics_under_desc')
    },
    OVER_UTILIZED: {
      label: t('gp_booking_analytics_over_utilized'),
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      description: t('gp_booking_analytics_over_desc')
    },
    ON_TRACK: {
      label: t('gp_booking_analytics_balanced'),
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      description: t('gp_booking_analytics_balanced_desc')
    }
  }
  if (isLoading) {
    return (
      <div className='bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex items-center justify-center h-full'>
        <div className='flex items-center gap-3 text-slate-500 font-semibold'>
          <LoadingOutlined />
          {t('gp_booking_analytics_loading')}
        </div>
      </div>
    )
  }

  if (!data) return null

  const status = statusConfig[data.fairnessStatus] || statusConfig.ON_TRACK

  const metrics = [
    { label: t('gp_booking_analytics_ownership'), value: `${data.ownershipPercentage.toFixed(1)}%` },
    { label: t('gp_booking_analytics_actual'), value: `${data.actualHoursLast4Weeks.toFixed(1)}h` },
    { label: t('gp_booking_analytics_expected'), value: `${data.expectedHoursLast4Weeks.toFixed(1)}h` },
    { label: t('gp_booking_analytics_this_week'), value: `${data.hoursThisWeek.toFixed(1)}h / ${data.bookingsThisWeek} booking` }
  ]

  return (
    <div className='bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-semibold text-slate-500 uppercase tracking-wide'>{t('gp_booking_analytics_title')}</p>
          <h3 className='text-2xl font-bold text-slate-900 mt-1'>{t('gp_booking_analytics_ai_title')}</h3>
        </div>
        <span className={`px-4 py-1 rounded-full text-xs font-bold border ${status.badge}`}>{status.label}</span>
      </div>

      <p className='text-slate-600 text-sm leading-relaxed'>{status.description}</p>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className='bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-100'
          >
            <p className='text-xs uppercase tracking-wide text-slate-500 font-semibold'>{metric.label}</p>
            <p className='text-xl font-bold text-slate-900 mt-1'>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className='grid md:grid-cols-2 gap-4'>
        <div className='bg-slate-50 rounded-2xl p-4 border border-slate-100'>
          <p className='text-xs font-bold text-slate-500 uppercase mb-2'>{t('gp_booking_analytics_action_items')}</p>
          <ul className='space-y-2'>
            {(data.actionItems ?? []).map((item, idx) => (
              <li key={idx} className='flex items-start gap-2 text-sm text-slate-700'>
                <span className='mt-1 h-2 w-2 rounded-full bg-cyan-500'></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className='bg-slate-50 rounded-2xl p-4 border border-slate-100'>
          <p className='text-xs font-bold text-slate-500 uppercase mb-3'>{t('gp_booking_analytics_leaderboard')}</p>
          <div className='space-y-2'>
            {data.leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className='flex items-center justify-between text-sm bg-white rounded-xl px-4 py-2 border border-slate-100'
              >
                <div>
                  <p className='font-semibold text-slate-900'>{entry.userName}</p>
                  <p className='text-xs text-slate-500'>
                    {entry.totalHours.toFixed(1)}h · {entry.ownershipPercentage.toFixed(1)}%
                  </p>
                </div>
                <span
                  className={`text-xs font-bold ${
                    entry.usageToShareRatio > 1.1 ? 'text-rose-500' : entry.usageToShareRatio < 0.9 ? 'text-amber-500' : 'text-emerald-600'
                  }`}
                >
                  {(entry.usageToShareRatio * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageAnalyticsCard

