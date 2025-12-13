import { BarChartOutlined, CalendarOutlined, WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import groupApi from '../../../../apis/group.api'
import { setGroupIdToLS } from '../../../../utils/auth'
import GroupHeader from '../../components/GroupHeader'
import Banner from './components/Banner'
import BenefitCard from './components/BenefitCard'
import StepCard from './components/StepCard/StepCard'
import UsageReportCard from './components/UsageReportCard'
import { AppContext } from '../../../../contexts/app.context'
import { useI18n } from '../../../../i18n/useI18n'

export default function DashboardGP() {
  const { groupId } = useParams<{ groupId: string }>()
  const { setGroupId, subscribeGroupNotifications, unsubscribeGroupNotifications } = useContext(AppContext)
  const { t } = useI18n()

  useEffect(() => {
    if (!groupId) return
    setGroupId(groupId)
    setGroupIdToLS(groupId)
    subscribeGroupNotifications(groupId)

    return () => {
      unsubscribeGroupNotifications(groupId)
    }
  }, [groupId, setGroupId, subscribeGroupNotifications, unsubscribeGroupNotifications])

  const usageReportQuery = useQuery({
    queryKey: ['usage-report', groupId],
    queryFn: () => groupApi.getUsageReport(groupId as string),
    enabled: !!groupId
  })

  return (
    <div className='w-full max-w-5xl rounded-[2rem] backdrop-blur-[60px] bg-gradient-to-br from-white/22 via-white/16 to-white/20 shadow-[0_15px_70px_rgba(6,182,212,0.5),0_30px_100px_rgba(14,165,233,0.4),0_0_150px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border-[4px] border-white/60 p-10 space-y-8 m-12 relative overflow-hidden'>
      {/* Top Gradient Bar */}
      <div className='absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]' />

      {/* Group Header */}
      <GroupHeader groupId={groupId} />
      {/* Top banner */}
      <Banner />

      {/* Usage report */}
      <UsageReportCard data={usageReportQuery.data?.data} isLoading={usageReportQuery.isLoading} />

      {/* Main content grid */}
      <div className='grid lg:grid-cols-2 gap-8'>
        {/* Left card - Steps */}
        <div className='group relative'>
          <div className='absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-400' />
          <div className='relative rounded-3xl bg-white/15 backdrop-blur-xl border-[3px] border-white/40 p-8 shadow-[0_0_30px_rgba(16,185,129,0.3),inset_0_1px_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all duration-400'>
            <h2 className='text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.7)] mb-8'>
              {t('gp_steps_title')}
            </h2>
            <div className='space-y-5'>
              <StepCard
                num='1'
                title={t('gp_step1_title')}
                desc={t('gp_step1_desc')}
                color='from-green-400 to-emerald-500'
              />
              <StepCard
                num='2'
                title={t('gp_step2_title')}
                desc={t('gp_step2_desc')}
                color='from-emerald-400 to-teal-500'
              />
              <StepCard
                num='3'
                title={t('gp_step3_title')}
                desc={t('gp_step3_desc')}
                color='from-teal-400 to-cyan-500'
              />
            </div>
          </div>
        </div>

        {/* Right card - Benefits */}
        <div className='group relative'>
          <div className='absolute -inset-1 bg-gradient-to-r from-cyan-400 to-sky-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-400' />
          <div className='relative rounded-3xl bg-white/15 backdrop-blur-xl border-[3px] border-white/40 p-8 shadow-[0_0_30px_rgba(6,182,212,0.3),inset_0_1px_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all duration-400'>
            <h2 className='text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.7)] mb-8'>
              {t('gp_benefits_title')}
            </h2>
            <div className='space-y-5'>
              <BenefitCard
                icon={<CalendarOutlined />}
                title={t('gp_benefit_schedule_title')}
                desc={t('gp_benefit_schedule_desc')}
              />
              <BenefitCard
                icon={<WalletOutlined />}
                title={t('gp_benefit_fund_title')}
                desc={t('gp_benefit_fund_desc')}
              />
              <BenefitCard
                icon={<BarChartOutlined />}
                title={t('gp_benefit_cost_title')}
                desc={t('gp_benefit_cost_desc')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className='text-center text-white/75 text-base font-medium'>{t('gp_footer_note')}</p>

      {/* Bottom Gradient Bar */}
      <div className='absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-200 via-sky-100 to-cyan-200 shadow-[0_0_20px_rgba(14,165,233,0.6)]' />
    </div>
  )
}
