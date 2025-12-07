import { BarChartOutlined, CalendarOutlined, WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useContext, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import groupApi from '../../../../apis/group.api'
import userApi from '../../../../apis/user.api'
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
  const navigate = useNavigate()
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

  // Fetch user profile to check document status
  const userProfileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getProfile()
  })

  // Fetch group info to check ownership percentage
  const groupQuery = useQuery({
    queryKey: ['id-groups', groupId],
    queryFn: () => groupApi.getGroupById(groupId as string),
    enabled: !!groupId
  })

  // Fetch ownership data to check if percentage is set
  // Only fetch if step 1 and 2 are completed (to avoid unnecessary API calls)
  const ownershipQuery = useQuery({
    queryKey: ['group-ownership', groupId],
    queryFn: () => groupApi.getAllPercentageInGroup(groupId as string),
    enabled: !!groupId,
    retry: 1, // Only retry once on failure
    retryOnMount: false // Don't retry on remount if it failed
  })

  const usageReportQuery = useQuery({
    queryKey: ['usage-report', groupId],
    queryFn: () => groupApi.getUsageReport(groupId as string),
    enabled: !!groupId,
    retry: 1,
    retryOnMount: false
  })

  // Calculate step completion status
  const stepStatus = useMemo(() => {
    const profile = userProfileQuery.data?.data
    const ownershipData = ownershipQuery.data?.data

    // Step 1: Driver License (GPLX) - both front and back must be APPROVED
    const step1Completed =
      profile?.documents?.driverLicenseImages?.front?.status === 'APPROVED' &&
      profile?.documents?.driverLicenseImages?.back?.status === 'APPROVED'

    // Step 2: Citizen ID (CCCD) - both front and back must be APPROVED
    const step2Completed =
      profile?.documents?.citizenIdImages?.front?.status === 'APPROVED' &&
      profile?.documents?.citizenIdImages?.back?.status === 'APPROVED'

    // Step 3: Ownership Percentage - check if userOwnership.ownershipPercentage > 0
    // Only check if ownership query succeeded (not in error state)
    const userOwnership = ownershipQuery.isError ? null : ownershipData?.userOwnership
    const step3Completed =
      userOwnership?.ownershipPercentage != null && Number(userOwnership.ownershipPercentage) > 0

    return {
      step1: (step1Completed ? 'completed' : 'pending') as 'completed' | 'pending',
      step2: (step2Completed ? 'completed' : 'pending') as 'completed' | 'pending',
      step3: (step3Completed ? 'completed' : 'pending') as 'completed' | 'pending'
    }
  }, [userProfileQuery.data, ownershipQuery.data, ownershipQuery.isError])

  // Calculate progress
  const completedSteps = Object.values(stepStatus).filter((status) => status === 'completed').length
  const totalSteps = 3
  const progressPercentage = (completedSteps / totalSteps) * 100

  // Determine next step to complete
  const nextStep = useMemo(() => {
    if (stepStatus.step1 === 'pending') return 1
    if (stepStatus.step2 === 'pending') return 2
    if (stepStatus.step3 === 'pending') return 3
    return null // All steps completed
  }, [stepStatus])

  // Handle step card click
  const handleStepClick = (stepNum: number) => {
    if (stepNum === 1 || stepNum === 2) {
      // Navigate to upload license page
      navigate('/dashboard/uploadLicense')
    } else if (stepNum === 3) {
      // Navigate to ownership percentage page
      navigate(`/dashboard/viewGroups/${groupId}/ownershipPercentage`)
    }
  }

  // Handle CTA button click
  const handleCTAClick = () => {
    if (nextStep === 1 || nextStep === 2) {
      navigate('/dashboard/uploadLicense')
    } else if (nextStep === 3) {
      navigate(`/dashboard/viewGroups/${groupId}/ownershipPercentage`)
    }
  }

  return (
    <div className='w-full max-w-5xl rounded-[1.5rem] sm:rounded-[2rem] backdrop-blur-[60px] bg-gradient-to-br from-white/22 via-white/16 to-white/20 shadow-[0_15px_70px_rgba(6,182,212,0.5),0_30px_100px_rgba(14,165,233,0.4),0_0_150px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border-[2px] sm:border-[4px] border-white/60 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 m-4 sm:m-8 lg:m-12 relative overflow-hidden'>
      {/* Top Gradient Bar */}
      <div className='absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]' />

      {/* Group Header */}
      <GroupHeader groupId={groupId} />
      {/* Top banner */}
      <Banner completedSteps={completedSteps} totalSteps={totalSteps} />

      {/* Usage report */}
      <UsageReportCard
        data={usageReportQuery.data?.data}
        isLoading={usageReportQuery.isLoading}
        isError={usageReportQuery.isError}
      />

      {/* Main content grid */}
      <div className='grid lg:grid-cols-2 gap-6 sm:gap-8'>
        {/* Left card - Steps */}
        <div className='group relative'>
          <div className='absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-400' />
          <div className='relative rounded-2xl sm:rounded-3xl bg-white/15 backdrop-blur-xl border-[2px] sm:border-[3px] border-white/40 p-4 sm:p-6 lg:p-8 shadow-[0_0_30px_rgba(16,185,129,0.3),inset_0_1px_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all duration-400'>
            <h2 className='text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.7)] mb-6 sm:mb-8'>
              {t('gp_steps_title')}
            </h2>
            <div className='space-y-4 sm:space-y-5'>
              <StepCard
                num='1'
                title={t('gp_step1_title')}
                desc={t('gp_step1_desc')}
                color='from-green-400 to-emerald-500'
                status={stepStatus.step1}
                onClick={() => handleStepClick(1)}
                isClickable={true}
              />
              <StepCard
                num='2'
                title={t('gp_step2_title')}
                desc={t('gp_step2_desc')}
                color='from-emerald-400 to-teal-500'
                status={stepStatus.step2}
                onClick={() => handleStepClick(2)}
                isClickable={stepStatus.step1 === 'completed'}
              />
              <StepCard
                num='3'
                title={t('gp_step3_title')}
                desc={t('gp_step3_desc')}
                color='from-teal-400 to-cyan-500'
                status={stepStatus.step3}
                onClick={() => handleStepClick(3)}
                isClickable={stepStatus.step1 === 'completed' && stepStatus.step2 === 'completed'}
              />
            </div>
          </div>
        </div>

        {/* Right card - Benefits */}
        <div className='group relative'>
          <div className='absolute -inset-1 bg-gradient-to-r from-cyan-400 to-sky-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-400' />
          <div className='relative rounded-2xl sm:rounded-3xl bg-white/15 backdrop-blur-xl border-[2px] sm:border-[3px] border-white/40 p-4 sm:p-6 lg:p-8 shadow-[0_0_30px_rgba(6,182,212,0.3),inset_0_1px_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all duration-400'>
            <h2 className='text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.7)] mb-6 sm:mb-8'>
              {t('gp_benefits_title')}
            </h2>
            <div className='space-y-4 sm:space-y-5'>
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

      {/* CTA Button */}
      {nextStep !== null && (
        <div className='flex justify-center'>
          <button
            onClick={handleCTAClick}
            className='px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-base sm:text-lg shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center'
          >
            <span>{nextStep === 1 || nextStep === 2 ? t('gp_cta_start_upload') : t('gp_cta_set_percentage')}</span>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={2.5}
              stroke='currentColor'
              className='w-5 h-5'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
            </svg>
          </button>
        </div>
      )}

      {/* Footer note */}
      <div className='flex items-center justify-center gap-2 text-center'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={2}
          stroke='currentColor'
          className='w-5 h-5 text-yellow-300'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
          />
        </svg>
        <p className='text-white/90 text-base font-medium'>{t('gp_footer_note')}</p>
      </div>

      {/* Bottom Gradient Bar */}
      <div className='absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-200 via-sky-100 to-cyan-200 shadow-[0_0_20px_rgba(14,165,233,0.6)]' />
    </div>
  )
}
