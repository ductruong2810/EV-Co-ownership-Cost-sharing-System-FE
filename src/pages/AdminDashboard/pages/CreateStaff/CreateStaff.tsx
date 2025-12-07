import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { toast } from 'react-toastify'
import adminApi from '../../../../apis/admin.api'
import logger from '../../../../utils/logger'
import AdminPageContainer from '../../AdminPageContainer'
import AdminPageHeader from '../../AdminPageHeader'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useI18n } from '../../../../i18n/useI18n'
import { showErrorToast } from '../../../../components/Error/ErrorToast'
import { ErrorType, ErrorSeverity } from '../../../../types/error.type'

// Validation schema factory
const createStaffSchemaFactory = (t: (key: string) => string) => yup.object({
  fullName: yup
    .string()
    .required(t('admin_create_staff_validation_fullname_required'))
    .matches(/^[\p{L}\s]+$/u, t('admin_create_staff_validation_fullname_invalid'))
    .max(100, t('admin_create_staff_validation_fullname_max')),
  email: yup.string().required(t('admin_create_staff_validation_email_required')).email(t('admin_create_staff_validation_email_invalid')),
  phoneNumber: yup
    .string()
    .required(t('admin_create_staff_validation_phone_required'))
    .matches(/^0\d{9}$/, t('admin_create_staff_validation_phone_invalid')),
  password: yup
    .string()
    .required(t('admin_create_staff_validation_password_required'))
    .min(8, t('admin_create_staff_validation_password_min'))
    .max(50, t('admin_create_staff_validation_password_max'))
    .matches(
      /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,./?~`])/,
      t('admin_create_staff_validation_password_pattern')
    )
})

interface CreateStaffForm {
  fullName: string
  email: string
  phoneNumber: string
  password: string
}

export default function CreateStaff() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(createStaffSchemaFactory(t))
  })

  // Query to get all staff
  const { data: allStaffList, isLoading } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => adminApi.getAllStaff().then((res) => res.data?.data || [])
  })

  // Filter staff by search term
  const staffList = useMemo(() => {
    if (!searchTerm.trim()) return allStaffList || []
    const searchLower = searchTerm.toLowerCase()
    return (allStaffList || []).filter(
      (staff: any) =>
        staff.fullName?.toLowerCase().includes(searchLower) ||
        staff.email?.toLowerCase().includes(searchLower) ||
        staff.phoneNumber?.toLowerCase().includes(searchLower)
    )
  }, [allStaffList, searchTerm])

  // Mutation to create staff
  const createStaffMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => adminApi.createStaff(data as CreateStaffForm),
    onSuccess: () => {
      toast.success(t('admin_create_staff_success'))
      reset()
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t('admin_create_staff_error')
      showErrorToast({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        message: message,
        timestamp: new Date()
      })
      logger.error('Create staff error:', error)
    }
  })

  const onSubmit = (data: CreateStaffForm) => {
    createStaffMutation.mutate(data)
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow={t('admin_nav_section_contracts_team')}
        title={t('admin_create_staff_title')}
        subtitle={t('admin_create_staff_subtitle')}
      />

      {/* Loading State */}
      {isLoading && (
        <div className='mb-6 flex items-center justify-center py-8 bg-white rounded-xl shadow-sm border border-gray-100'>
          <Spin size='large' />
          <span className='ml-3 text-gray-600 font-medium'>{t('admin_create_staff_loading')}</span>
        </div>
      )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Create Form */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-xl shadow-lg p-6'>
              <h2 className='text-xl font-semibold text-gray-800 mb-4'>{t('admin_create_staff_form_title')}</h2>
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                {/* Full Name */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_create_staff_fullname_label')}</label>
                  <input
                    {...register('fullName')}
                    type='text'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder={t('admin_create_staff_fullname_placeholder')}
                  />
                  {errors.fullName && <p className='text-red-500 text-sm mt-1'>{errors.fullName.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_create_staff_email_label')}</label>
                  <input
                    {...register('email')}
                    type='email'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder={t('admin_create_staff_email_placeholder')}
                  />
                  {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_create_staff_phone_label')}</label>
                  <input
                    {...register('phoneNumber')}
                    type='tel'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='0123456789'
                  />
                  {errors.phoneNumber && <p className='text-red-500 text-sm mt-1'>{errors.phoneNumber.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_create_staff_password_label')}</label>
                  <div className='relative'>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      placeholder={t('admin_create_staff_password_placeholder')}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.password && <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>}
                  <p className='text-xs text-gray-500 mt-1'>
                    {t('admin_create_staff_password_hint')}
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type='submit'
                  disabled={createStaffMutation.isPending}
                  className='w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  {createStaffMutation.isPending ? t('admin_create_staff_creating') : t('admin_create_staff_submit')}
                </button>
              </form>
            </div>
          </div>

          {/* Staff List */}
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-xl shadow-lg p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-gray-800'>
                  {t('admin_create_staff_list_title', {
                    count: staffList?.length || 0,
                    total: allStaffList && allStaffList.length !== staffList.length ? ` of ${allStaffList.length}` : ''
                  })}
                </h2>
              </div>
              <Input
                placeholder={t('admin_create_staff_search_placeholder')}
                prefix={<SearchOutlined className='text-gray-400' />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                className='mb-4'
                size='large'
              />
              {staffList && staffList.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>{t('admin_create_staff_table_name')}</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>{t('admin_create_staff_table_email')}</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>{t('admin_create_staff_table_phone')}</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>{t('admin_create_staff_table_status')}</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>{t('admin_create_staff_table_created')}</th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {staffList.map((staff: any) => (
                        <tr key={staff.userId} className='hover:bg-gray-50 transition-colors'>
                          <td className='py-3 px-4 text-sm font-medium text-gray-900'>{staff.fullName}</td>
                          <td className='py-3 px-4 text-sm text-gray-600'>{staff.email}</td>
                          <td className='py-3 px-4 text-sm text-gray-600'>{staff.phoneNumber || '-'}</td>
                          <td className='py-3 px-4'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                staff.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {staff.status === 'ACTIVE' ? t('admin_create_staff_status_active') : t('admin_create_staff_status_inactive')}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-sm text-gray-500'>
                            {new Date(staff.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200'>
                  {searchTerm ? t('admin_create_staff_no_match') : t('admin_create_staff_no_staff')}
                </div>
              )}
            </div>
          </div>
        </div>
    </AdminPageContainer>
  )
}


