import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation } from '@tanstack/react-query'
import classNames from 'classnames'
import { motion } from 'framer-motion'
import { useContext, useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { showSuccessToast, showErrorToast } from '../../components/Error'
import { HiMail, HiLockClosed, HiArrowRight, HiEye, HiEyeOff } from 'react-icons/hi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { Checkbox } from 'antd'
import type { AxiosError } from 'axios'
import authApi from '../../apis/auth.api'
import path from '../../constants/path'
import { AppContext } from '../../contexts/app.context'
import {
  setAccessTokenToLS,
  setEmailAccountToLS,
  setRoleToLS,
  setRefreshTokenToLS,
  getRememberedEmailFromLS,
  setRememberedEmailToLS,
  clearRememberedEmailFromLS
} from '../../utils/auth'
import { loginSchema, type LoginSchema } from '../../utils/rule'
import { LOGIN_IMG_URL } from '../../constants/images'
import logger from '../../utils/logger'
import { getUserFriendlyError, convertToErrorInfo } from '../../utils/errorHandler'

type LoginErrorResponse = {
  errors?: { message?: string }[]
  message?: string
  error?: string
}

export default function Login() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const rememberedEmail = getRememberedEmailFromLS()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginSchema>({
    resolver: yupResolver(loginSchema) as Resolver<LoginSchema>,
    defaultValues: {
      email: rememberedEmail || ''
    }
  })

  // Set email from remembered email when component mounts
  useEffect(() => {
    if (rememberedEmail) {
      setValue('email', rememberedEmail)
      setRememberMe(true)
    }
  }, [rememberedEmail, setValue])

  const { setIsAuthenticated } = useContext(AppContext)
  const navigate = useNavigate()

  // loginMutation sử dụng react-query dùng để fetch api đăng ký tài khoảng
  const loginMutation = useMutation({
    mutationFn: (body: { email: string; password: string }) => authApi.login(body)
  })
  // Khi nào mà cần truyền thêm gì lên thì phải sử dụng mutate tách riêng ra
  const onSubmit = handleSubmit((data) => {
    setServerError(null)
    logger.debug('Login attempt:', { email: data.email })

    // Lưu email nếu chọn remember me
    if (rememberMe && data.email) {
      setRememberedEmailToLS(data.email)
    } else {
      clearRememberedEmailFromLS()
    }

    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        // *Data trong onSuccess là data trả về từ server sau khi call api
        onSuccess: (response) => {
          logger.info('Login successful')
          // Mục đích set luôn là để cho nó đồng bộ luôn chứ lúc đầu nó đâu có sẵn mà lấy từ LS
          //phải ctrl r mới có sẽ bị bất đồng bộ
          setAccessTokenToLS(response.data?.accessToken as string)
          if (response.data?.refreshToken) {
            setRefreshTokenToLS(response.data.refreshToken as string)
          }
          const userRole = response.data?.role as string
          setRoleToLS(userRole)
          setEmailAccountToLS(data.email)
          setIsAuthenticated(true)

          // Hiển thị thông báo thành công
          showSuccessToast('Login successful! Welcome back.', 'Success')

          const destination =
            userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'TECHNICIAN'
              ? path.adminDashboard
              : path.dashBoard
          navigate(destination, { replace: true })
        },
        onError: (error) => {
          logger.error('Login failed:', error)
          const axiosError = error as AxiosError<LoginErrorResponse>
          
          // Check if it's a network error (no response from server)
          if (!axiosError.response) {
            // Network error - show toast notification only (consistent with other pages)
            // No need to show in form since toast is already visible
            const errorInfo = convertToErrorInfo(error)
            showErrorToast(errorInfo, {
              autoClose: 5000
            })
            return
          }
          
          // Authentication error (401) or other server errors
          // Only show in form, no toast (user input error, not system error)
          const res = axiosError.response?.data
          const message = res?.errors?.[0]?.message || res?.message || res?.error || 'Email or password is incorrect'
          setServerError(message)
        }
      }
    )
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
          {/* Left image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ backgroundImage: `url(${LOGIN_IMG_URL})` }}
            className='bg-cover bg-center hidden lg:block'
          ></motion.div>

          {/* Right form */}
          <div className='flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-lg p-10'>
            <motion.form
              onSubmit={onSubmit}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className='w-full max-w-xl space-y-6'
            >
              <h2 className='text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-400 drop-shadow-lg'>
                Welcome Back
              </h2>
              <p className='text-center text-gray-300'>Login to your account</p>

              {/* Email */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>Email</label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiMail className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('email')}
                    type='email'
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition'
                    placeholder='Enter your email'
                  />
                </div>
                {errors.email && <p className='text-red-400 text-sm mt-1'>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className='block mb-2 text-sm font-medium text-gray-300'>Password</label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <HiLockClosed className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className='w-full rounded-lg border border-gray-600 bg-slate-800/50 pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition'
                    placeholder='Enter your password'
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

              {/* Remember Me */}
              <div className='flex items-center'>
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className='text-gray-300'
                >
                  <span className='text-gray-300 text-sm'>Remember me</span>
                </Checkbox>
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
                whileHover={loginMutation.isPending ? {} : { scale: 1.02, boxShadow: '0 0 20px rgba(34,211,238,0.6)' }}
                whileTap={loginMutation.isPending ? {} : { scale: 0.98 }}
                type='submit'
                className={classNames(
                  'w-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2',
                  {
                    'opacity-70 cursor-not-allowed': loginMutation.isPending,
                    'hover:shadow-xl': !loginMutation.isPending
                  }
                )}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <AiOutlineLoading3Quarters className='h-5 w-5 animate-spin' />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <HiArrowRight className='h-5 w-5' />
                  </>
                )}
              </motion.button>

              <p className='text-center text-sm text-gray-400'>
                Don’t have an account?{' '}
                <Link to={path.register} className='text-cyan-300 hover:underline'>
                  Sign up
                </Link>
              </p>
              <div className='text-center text-sm text-gray-400'>
                <Link to={path.forgotPassword} className='text-emerald-300 hover:underline'>
                  Forgot password?
                </Link>
              </div>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
