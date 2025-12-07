import type { UsageAnalytics } from '../../../../../types/api/group.type'

interface UsageReportCardProps {
  data?: UsageAnalytics
  isLoading: boolean
  isError?: boolean
}

const statusStyles: Record<
  string,
  { badge: string; description: string; gradient: string }
> = {
  UNDER_UTILIZED: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Bạn đang sử dụng ít hơn quyền sở hữu. Hãy chủ động đặt thêm slot.',
    gradient: 'from-amber-400/30 to-orange-400/40'
  },
  OVER_UTILIZED: {
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    description: 'Mức sử dụng vượt quyền. Nên chuyển sang khung giờ vắng hơn.',
    gradient: 'from-rose-400/30 to-red-400/40'
  },
  ON_TRACK: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Bạn đang sử dụng cân bằng với tỷ lệ sở hữu.',
    gradient: 'from-emerald-400/20 to-teal-400/30'
  }
}

const UsageReportCard = ({ data, isLoading, isError }: UsageReportCardProps) => {
  if (isLoading) {
    return (
      <div className='rounded-3xl bg-white/20 border-[3px] border-white/50 backdrop-blur-xl p-6 text-white/70'>
        Đang tải báo cáo sử dụng cá nhân...
      </div>
    )
  }

  // Silently hide if error or no data (optional feature)
  if (isError || !data) return null

  const status = statusStyles[data.fairnessStatus] || statusStyles.ON_TRACK
  const totalSlots = data.totalQuotaSlots ?? 0
  const usedSlots = data.usedQuotaSlots ?? 0
  const remainingSlots = data.remainingQuotaSlots ?? 0
  const quotaPercent = totalSlots > 0 ? Math.min(100, Math.max(0, (usedSlots / totalSlots) * 100)) : 0

  return (
    <div className='relative rounded-3xl bg-white/15 backdrop-blur-xl border-[3px] border-white/40 p-8 shadow-[0_0_30px_rgba(14,165,233,0.25),inset_0_1px_15px_rgba(255,255,255,0.1)]'>
      <div
        className={`absolute inset-0 rounded-3xl opacity-40 blur-2xl pointer-events-none bg-gradient-to-br ${status.gradient}`}
      />
      <div className='relative space-y-6 text-white'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-white/70 font-semibold'>Usage dashboard</p>
            <h3 className='text-3xl font-bold mt-1'>Personal utilization report</h3>
          </div>
          <span className={`px-4 py-1 rounded-full text-xs font-bold border ${status.badge}`}>{data.fairnessStatus}</span>
        </div>
        <p className='text-white/80 text-sm leading-relaxed'>{status.description}</p>

        <div className='grid sm:grid-cols-3 gap-4'>
          <StatBlock label='Ownership %' value={`${data.ownershipPercentage.toFixed(1)}%`} />
          <StatBlock
            label='Actual vs expected (4 tuần)'
            value={`${data.actualHoursLast4Weeks.toFixed(1)}h`}
            helper={`Expected ${data.expectedHoursLast4Weeks.toFixed(1)}h`}
          />
          <StatBlock label='Tuần này' value={`${data.hoursThisWeek.toFixed(1)}h`} helper={`${data.bookingsThisWeek} bookings`} />
        </div>

        <div>
          <div className='flex items-center justify-between text-xs font-semibold text-white/70 mb-2'>
            <span>Quota sử dụng</span>
            <span>
              {usedSlots}/{totalSlots} slot (còn {remainingSlots})
            </span>
          </div>
          <div className='h-3 rounded-full bg-white/20 overflow-hidden border border-white/30'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all'
              style={{ width: `${quotaPercent}%` }}
            ></div>
          </div>
        </div>

        <div className='bg-white/10 border border-white/20 rounded-2xl p-4 space-y-2'>
          <p className='text-xs font-bold uppercase tracking-[0.2em] text-white/70'>Action items</p>
          <ul className='space-y-2 text-sm text-white'>
            {(data.actionItems ?? []).map((item, idx) => (
              <li key={idx} className='flex items-start gap-2'>
                <span className='mt-1 text-cyan-200'>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

const StatBlock = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className='rounded-2xl border border-white/30 bg-white/10 p-4'>
    <p className='text-xs uppercase tracking-[0.3em] text-white/70 font-semibold'>{label}</p>
    <p className='text-2xl font-bold text-white mt-1'>{value}</p>
    {helper && <p className='text-xs text-white/70 flex items-center gap-1 mt-1'>{helper}</p>}
  </div>
)

export default UsageReportCard

