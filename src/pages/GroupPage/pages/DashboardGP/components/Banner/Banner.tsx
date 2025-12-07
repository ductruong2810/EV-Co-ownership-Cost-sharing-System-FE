import { useI18n } from '../../../../../../i18n/useI18n'

interface BannerProps {
  completedSteps: number
  totalSteps: number
}

export default function Banner({ completedSteps, totalSteps }: BannerProps) {
  const { t } = useI18n()
  const progressPercentage = (completedSteps / totalSteps) * 100
  const allCompleted = completedSteps === totalSteps

  const getBannerText = () => {
    if (allCompleted) {
      return t('gp_banner_all_completed')
    }
    if (completedSteps === 0) {
      return t('gp_banner_start')
    }
    return t('gp_banner_progress', { completed: completedSteps, total: totalSteps })
  }

  return (
    <div className='relative'>
      <div className='absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-sky-500/30 blur-xl' />
      <div className='relative rounded-2xl bg-white/15 backdrop-blur-xl border-[2px] border-white/40 px-8 py-5 text-center shadow-[0_0_30px_rgba(6,182,212,0.4),inset_0_1px_15px_rgba(255,255,255,0.1)]'>
        <p className='text-white text-xl font-bold tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-3'>
          {getBannerText()}
        </p>
        {/* Progress Bar */}
        <div className='w-full bg-white/20 rounded-full h-2.5 overflow-hidden'>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allCompleted
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-cyan-400 to-sky-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className='text-white/80 text-sm font-medium mt-2'>
          {progressPercentage.toFixed(0)}% {t('gp_banner_complete')}
        </p>
      </div>
    </div>
  )
}
