import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { HiMail, HiLockClosed, HiUser, HiPhone, HiArrowRight, HiEye, HiEyeOff } from 'react-icons/hi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { showErrorToast } from '../../components/Error'
import { convertToErrorInfo } from '../../utils/errorHandler'
import authApi from '../../apis/auth.api'
import path from '../../constants/path'
import { registerSchema, type RegisterSchema } from '../../utils/rule'
import classNames from 'classnames'
import { REGISTER_IMG_URL } from '../../constants/images'
import type { AxiosError } from 'axios'
import { useI18n } from '../../i18n/useI18n'

type RegisterErrorResponse = {
  errors?: { message?: string; field?: string }[]
  message?: string
  error?: string
}

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const { t } = useI18n()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterSchema>({
    resolver: yupResolver(registerSchema)
  })

  const navigate = useNavigate()

  const registerMutation = useMutation({
    mutationFn: (body: RegisterSchema) => authApi.register(body)
  })

  const onSubmit = handleSubmit((response: RegisterSchema) => {
    setServerError(null)
    registerMutation.mutate(response, {
      onSuccess: (response) => {
        navigate(path.OTP, {
          state: {
            message: response.data.message,
            email: response.data.email,
            type: response.data.type
          }
        })
      },
      onError: (error) => {
        const axiosError = error as AxiosError<RegisterErrorResponse>
        
        // Check if it's a network error
        if (!axiosError.response) {
          const errorInfo = convertToErrorInfo(error)
          showErrorToast(errorInfo, {
            autoClose: 5000
          })
          return
        }
        
        // Server validation errors
        const res = axiosError.response?.data
        const errorMessage =
          res?.errors?.[0]?.message || res?.message || res?.error || t('register_failed_default')
        setServerError(errorMessage)
      }
    })
  })

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-600'>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className='container'
      >
        <div className='grid grid-cols-1 lg:grid-cols-2 min-h-[650px] rounded-3xl overflow-hidden shadow-2xl'>
          {/* Left form */}
          <div className='flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-lg p-10'>
            <motion.form
              onSubmit={onSubmit}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className='w-full max-w-xl space-y-6'
            >
              <h2 className='text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-400 drop-shadow-lg'>
                {t('register_title')}
              </h2>
              <p className='text-center text-gray-300'>{t('register_subtitle')}</p>

              {/* Full Name */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>
                  {t('register_full_name_label')}
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiUser className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('fullName')}
                    type='text'
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition'
                    placeholder={t('register_full_name_placeholder')}
                  />
                </div>
                {errors.fullName && <p className='text-red-400 text-sm mt-1'>{errors.fullName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>
                  {t('register_email_label')}
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiMail className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('email')}
                    type='email'
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition'
                    placeholder={t('register_email_placeholder')}
                  />
                </div>
                {errors.email && <p className='text-red-400 text-sm mt-1'>{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>
                  {t('register_phone_label')}
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiPhone className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('phone')}
                    type='tel'
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition'
                    placeholder={t('register_phone_placeholder')}
                  />
                </div>
                {errors.phone && <p className='text-red-400 text-sm mt-1'>{errors.phone.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>
                  {t('register_password_label')}
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiLockClosed className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition'
                    placeholder={t('register_password_placeholder')}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors'
                  >
                    {showPassword ? <HiEyeOff className='h-5 w-5' /> : <HiEye className='h-5 w-5' />}
                  </button>
                </div>
                {errors.password && <p className='text-red-400 text-sm mt-1'>{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>
                  {t('register_confirm_password_label')}
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiLockClosed className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition'
                    placeholder={t('register_confirm_password_placeholder')}
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors'
                  >
                    {showConfirmPassword ? <HiEyeOff className='h-5 w-5' /> : <HiEye className='h-5 w-5' />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className='text-red-400 text-sm mt-1'>{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Server error message */}
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='bg-red-500/10 border border-red-500/30 rounded-lg p-3'
                >
                  <p className='text-red-400 text-sm text-center'>{serverError}</p>
                </motion.div>
              )}

              {/* Button */}
              <motion.button
                whileHover={registerMutation.isPending ? {} : { scale: 1.02, boxShadow: '0 0 20px rgba(34,211,238,0.6)' }}
                whileTap={registerMutation.isPending ? {} : { scale: 0.98 }}
                type='submit'
                className={classNames(
                  'w-full rounded-lg bg-gradient-to-r from-emerald-400 via-cyan-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2',
                  {
                    'opacity-70 cursor-not-allowed': registerMutation.isPending,
                    'hover:shadow-xl': !registerMutation.isPending
                  }
                )}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <AiOutlineLoading3Quarters className='h-5 w-5 animate-spin' />
                    <span>{t('register_button_loading')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('register_button')}</span>
                    <HiArrowRight className='h-5 w-5' />
                  </>
                )}
              </motion.button>

              <p className='text-center text-sm text-gray-400'>
                {t('register_have_account')}{' '}
                <Link to={path.login} className='text-cyan-300 hover:underline'>
                  {t('register_sign_in')}
                </Link>
              </p>
            </motion.form>
          </div>

          {/* Right image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ backgroundImage: `url(${REGISTER_IMG_URL})` }}
            className='bg-cover bg-center hidden lg:block'
          ></motion.div>
        </div>
      </motion.div>
    </div>
  )
}
