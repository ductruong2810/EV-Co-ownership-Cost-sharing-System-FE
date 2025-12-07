import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import userApi from '../../apis/user.api'
import Skeleton from '../../components/Skeleton'
import ActivitiBadge from './Components/ActivityBadge'
import Avatar from './Components/Avatar/Avatar'
import DocCard from './Components/DocCard'
import Field from './Components/Field'
import GroupStatus from './Components/GroupStatus'
import Icon from './Components/Icon'
import Username from './Components/Username'
import { toast } from 'react-toastify'
import { useI18n } from '../../i18n/useI18n'
import path from '../../constants/path'
import authApi from '../../apis/auth.api'
import { showSuccessToast, showErrorToast } from '../../components/Error/ErrorToast'
import { ErrorType, ErrorSeverity } from '../../types/error.type'

export default function MyAccount() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editingField, setEditingField] = useState<'phone' | 'name' | 'email' | null>(null)
  const [editValue, setEditValue] = useState('')
  const { t } = useI18n()

  // Fetch user profile
  const {
    data: userProfile,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getProfile()
  })

  const user = userProfile?.data

  // Mutation for phone number
  const phonemutation = useMutation({
    mutationFn: (newPhone: string) => userApi.editPhoneNumber(String(user?.userId), newPhone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setEditingField(null)
      toast.success(t('my_account_update_phone_success'), {
        autoClose: 2500,
        position: 'top-right'
      })
    }
  })

  // Mutation for full name
  const nameMutation = useMutation({
    mutationFn: (newName: string) => userApi.editFullName(String(user?.userId), newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setEditingField(null)
      toast.success(t('my_account_update_name_success'), {
        autoClose: 2500,
        position: 'top-right'
      })
    }
  })

  // Mutation for change email (request OTP)
  const changeEmailMutation = useMutation({
    mutationFn: (newEmail: string) => authApi.requestChangeEmail({ newEmail }),
    onSuccess: (response) => {
      setEditingField(null)
      setEditValue('')
      toast.success(response.data.message || 'Verification code sent to your new email', {
        autoClose: 2500,
        position: 'top-right'
      })
      navigate(path.OTP, {
        state: {
          message: response.data.message,
          email: response.data.email,
          type: response.data.type
        }
      })
    }
  })

  // Mutation for update avatar
  const avatarMutation = useMutation({
    mutationFn: (avatarFile: File) => userApi.updateAvatar(avatarFile),
    onSuccess: async () => {
      // Invalidate and refetch both query keys to update UI in MyAccount and NavHeader
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      await queryClient.refetchQueries({ queryKey: ['user-profile'] })
      await queryClient.refetchQueries({ queryKey: ['userProfile'] })
      showSuccessToast('Avatar updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to update avatar'
      showErrorToast({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: errorMessage,
        timestamp: new Date()
      })
    }
  })

  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showErrorToast({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Please select an image file',
        timestamp: new Date()
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Image size must be less than 5MB',
        timestamp: new Date()
      })
      return
    }

    avatarMutation.mutate(file)
    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const handleEdit = (field: 'phone' | 'name' | 'email', currentValue: string) => {
    setEditingField(field)
    setEditValue(currentValue)
  }

  const handleSave = () => {
    if (editingField === 'phone') {
      phonemutation.mutate(editValue)
    } else if (editingField === 'name') {
      nameMutation.mutate(editValue)
    } else if (editingField === 'email') {
      if (!editValue || !editValue.includes('@')) {
        showErrorToast({
          type: ErrorType.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          message: 'Please enter a valid email address',
          timestamp: new Date()
        })
        return
      }
      changeEmailMutation.mutate(editValue)
    }
  }

  const handleCancel = () => {
    setEditingField(null)
    setEditValue('')
  }

  if (isLoading) {
    return <Skeleton />
  }

  if (isError || !user) {
    return (
      <div className='min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-600'>
        <div className='backdrop-blur-[60px] bg-white/20 rounded-3xl p-12 border-[3px] border-white/40 text-center'>
          <div className='w-16 h-16 bg-red-400/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-400/50'>
            <svg className='w-8 h-8 text-red-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </div>
          <p className='text-white font-bold text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-2'>
            {t('my_account_error_title')}
          </p>
          <p className='text-white/70'>{t('my_account_error_subtitle')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-6 font-sans bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-600 relative overflow-hidden'>
      {/* Background Effects */}
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editingField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4'
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className='bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border-[3px] border-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]'
            >
              <h3 className='text-2xl font-bold text-gray-800 mb-6'>
                {editingField === 'phone'
                  ? t('my_account_modal_edit_phone_title')
                  : t('my_account_modal_edit_name_title')}
              </h3>
              <input
                type='text'
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className='w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl text-gray-800 focus:outline-none focus:border-blue-400 transition-colors mb-6'
                placeholder={
                  editingField === 'phone'
                    ? t('my_account_modal_phone_placeholder')
                    : t('my_account_modal_name_placeholder')
                }
                autoFocus
              />
              <div className='flex gap-3'>
                <button
                  onClick={handleSave}
                  disabled={phonemutation.isPending || nameMutation.isPending}
                  className='flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold py-3 rounded-xl hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {phonemutation.isPending || nameMutation.isPending
                    ? t('my_account_modal_saving')
                    : t('my_account_modal_save')}
                </button>
                <button
                  onClick={handleCancel}
                  className='flex-1 bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors'
                >
                  {t('my_account_modal_cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className='w-full max-w-6xl backdrop-blur-[60px] bg-gradient-to-br from-white/22 via-white/16 to-white/20 rounded-[2.5rem] shadow-[0_15px_70px_rgba(6,182,212,0.5),0_30px_100px_rgba(14,165,233,0.4),0_0_150px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border-[4px] border-white/60 overflow-hidden relative z-10'
      >
        <div className='absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]' />

        <div className='grid lg:grid-cols-3 gap-8 p-8'>
          {/* Left Section */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className='lg:col-span-1 flex flex-col items-center justify-center space-y-6 bg-white/15 backdrop-blur-xl rounded-2xl p-8 border-[3px] border-white/40 shadow-[0_0_30px_rgba(6,182,212,0.3),inset_0_1px_15px_rgba(255,255,255,0.1)]'
          >
            <div className='relative'>
              <Avatar
                avatar={user?.avatarUrl || undefined}
                userId={user.userId.toString()}
                size={128}
                className='mx-auto'
                onClick={() => {
                  // Trigger file input click
                  const fileInput = document.getElementById('avatar-file-input') as HTMLInputElement
                  fileInput?.click()
                }}
              />
              <input
                id='avatar-file-input'
                type='file'
                accept='image/*'
                onChange={handleAvatarChange}
                className='hidden'
                disabled={avatarMutation.isPending}
              />
              {avatarMutation.isPending && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/20 rounded-full'>
                  <div className='w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin' />
                </div>
              )}
            </div>

            {/* Username with Edit Button */}
            <div className='relative group'>
              <Username username={user?.fullName as string} />
              <button
                onClick={() => handleEdit('name', user?.fullName as string)}
                className='absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2 rounded-lg shadow-lg hover:bg-white'
                title='Edit name'
              >
                <svg className='w-4 h-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                  />
                </svg>
              </button>
            </div>

            <GroupStatus
              totalGroups={user?.statistics.groupsJoined as number}
              status={user?.statistics.accountStatus as string}
            />

            <ActivitiBadge
              status={user?.statistics.accountStatus as string}
              time={user?.statistics.memberSince as string}
            />
          </motion.div>

          {/* Right Section */}
          <div className='lg:col-span-2 space-y-6'>
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Icon title={t('my_account_section_personal_info')}>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  className='text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                >
                  <circle cx='12' cy='8' r='4' fill='currentColor' />
                  <path
                    d='M4 20c0-4 3.5-7 8-7s8 3 8 7'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    fill='currentColor'
                  />
                </svg>
              </Icon>

              <motion.div
                className='grid md:grid-cols-2 gap-4'
                initial='hidden'
                animate='visible'
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
              >
                {/* Email Field - Not Editable */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.4 }}
                >
                  <div className='relative group'>
                    <Field label={t('my_account_field_email')} value={user?.email as string} glow={true} />
                    <button
                      onClick={() => handleEdit('email', user?.email as string)}
                      className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2 rounded-lg shadow-lg hover:bg-white'
                      title='Change email'
                    >
                      <svg className='w-4 h-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                        />
                      </svg>
                    </button>
                  </div>
                </motion.div>

                {/* Phone Field - Editable */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.4 }}
                  className='relative group'
                >
                  <Field label={t('my_account_field_phone')} value={user?.phoneNumber as string} glow={true} />
                  <button
                    onClick={() => handleEdit('phone', user?.phoneNumber as string)}
                    className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2 rounded-lg shadow-lg hover:bg-white'
                    title='Edit phone number'
                  >
                    <svg className='w-4 h-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                      />
                    </svg>
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Documents Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Icon title={t('my_account_section_license')}>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  className='text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                >
                  <path
                    d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'
                    stroke='currentColor'
                    strokeWidth='2'
                    fill='currentColor'
                    fillOpacity='0.3'
                  />
                  <path
                    d='M14 2v6h6'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </Icon>

              <div className='flex flex-col gap-4'>
                <div className='grid md:grid-cols-2 gap-4'>
                  <DocCard
                    title={t('my_account_doc_citizen')}
                    imageFront={user?.documents.citizenIdImages?.front?.imageUrl || ''}
                    imageBack={user?.documents.citizenIdImages?.back?.imageUrl || ''}
                    statusFront={user?.documents.citizenIdImages?.front?.status || ''}
                    statusBack={user?.documents.citizenIdImages?.back?.status || ''}
                  />
                  <DocCard
                    title={t('my_account_doc_driver')}
                    imageFront={user?.documents.driverLicenseImages?.front?.imageUrl || ''}
                    imageBack={user?.documents.driverLicenseImages?.back?.imageUrl || ''}
                    statusFront={user?.documents.driverLicenseImages?.front?.status || ''}
                    statusBack={user?.documents.driverLicenseImages?.back?.status || ''}
                  />
                </div>

                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={() => navigate(`/dashboard/${path.uploadLicense}`)}
                    className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 border border-white/40 text-xs sm:text-sm font-semibold text-white hover:bg-white/25 hover:border-white/60 shadow-[0_0_18px_rgba(6,182,212,0.45)] transition-all duration-300'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.8}
                      stroke='currentColor'
                      className='w-4 h-4'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 12l-4 4m0 0l-4-4m4 4V4'
                      />
                    </svg>
                    <span>{t('upload_header_title')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className='absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-200 via-sky-100 to-cyan-200 shadow-[0_0_20px_rgba(14,165,233,0.6)]' />
      </motion.div>
    </div>
  )
}
