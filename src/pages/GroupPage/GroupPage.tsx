import { motion } from 'framer-motion'
import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import groupApi from '../../apis/group.api'
import { Tag } from 'antd'
import { useI18n } from '../../i18n/useI18n'

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()

  const groupQuery = useQuery({
    queryKey: ['id-groups', groupId],
    queryFn: () => groupApi.getGroupById(groupId as string),
    enabled: !!groupId
  })

  const group = groupQuery.data?.data
  
  return (
    <motion.div
      key={groupId} // Force remount when groupId changes to prevent hook issues
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className='min-h-screen flex justify-center items-start pt-8 pb-10 relative overflow-hidden bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-600'
    >
      {/* Holographic Background Effects */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className='absolute top-20 right-20 w-[500px] h-[500px] bg-cyan-300/40 rounded-full blur-[120px]'
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className='absolute bottom-20 left-20 w-[500px] h-[500px] bg-indigo-400/40 rounded-full blur-[120px]'
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, delay: 1 }}
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-sky-300/35 rounded-full blur-[100px]'
        />
      </div>

      <div className='relative w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6'>
        {/* Group context bar */}
        <div className='mb-6 rounded-2xl bg-white/15 backdrop-blur-lg border border-white/30 shadow-[0_15px_40px_rgba(6,182,212,0.35)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <p className='text-xs font-semibold text-white/80 uppercase tracking-wide'>
              {t('gp_booking_group_label')}
            </p>
            <h1 className='text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.7)] leading-tight'>
              {group?.groupName || t('gp_booking_group_placeholder')}
            </h1>
            {group?.description && (
              <p className='text-sm text-white/80 mt-1'>{group.description}</p>
            )}
          </div>
          <div className='flex flex-wrap gap-2'>
            {groupId && <Tag color='blue-inverse'>{t('gp_booking_group_id', { id: groupId })}</Tag>}
          </div>
        </div>

        {/* Child content */}
        <Outlet />
      </div>
    </motion.div>
  )
}
