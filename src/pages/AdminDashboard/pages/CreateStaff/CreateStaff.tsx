import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { toast } from 'react-toastify'
import adminApi from '../../../../apis/admin.api'
import Skeleton from '../../../../components/Skeleton'
import logger from '../../../../utils/logger'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// Validation schema
const createStaffSchema = yup.object({
  fullName: yup
    .string()
    .required('Full name is required')
    .matches(/^[\p{L}\s]+$/u, 'Full name must not contain special characters or numbers')
    .max(100, 'Full name must not exceed 100 characters'),
  email: yup.string().required('Email is required').email('Invalid email format'),
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^0\d{9}$/, 'Invalid phone number format (must start with 0 and have 10 digits)'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password must not exceed 50 characters')
    .matches(
      /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,./?~`])/,
      'Password must have at least 1 uppercase letter and 1 special character'
    )
})

type CreateStaffForm = yup.InferType<typeof createStaffSchema>

export default function CreateStaff() {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateStaffForm>({
    resolver: yupResolver(createStaffSchema)
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
    mutationFn: (data: CreateStaffForm) => adminApi.createStaff(data),
    onSuccess: () => {
      toast.success('Staff account created successfully!')
      reset()
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create staff account'
      toast.error(message)
      logger.error('Create staff error:', error)
    }
  })

  const onSubmit = (data: CreateStaffForm) => {
    createStaffMutation.mutate(data)
  }

  if (isLoading) return <Skeleton />

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6'>
      <div className='max-w-6xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Create Staff Account</h1>
          <p className='text-gray-600'>Create a new staff account for system administration</p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Create Form */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-xl shadow-lg p-6'>
              <h2 className='text-xl font-semibold text-gray-800 mb-4'>New Staff Account</h2>
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                {/* Full Name */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Full Name</label>
                  <input
                    {...register('fullName')}
                    type='text'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='Enter full name'
                  />
                  {errors.fullName && <p className='text-red-500 text-sm mt-1'>{errors.fullName.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
                  <input
                    {...register('email')}
                    type='email'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='Enter email address'
                  />
                  {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Phone Number</label>
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
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
                  <div className='relative'>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      placeholder='Enter password'
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
                    Must have 8-50 characters, at least 1 uppercase and 1 special character
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type='submit'
                  disabled={createStaffMutation.isPending}
                  className='w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  {createStaffMutation.isPending ? 'Creating...' : 'Create Staff Account'}
                </button>
              </form>
            </div>
          </div>

          {/* Staff List */}
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-xl shadow-lg p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-gray-800'>
                  Staff Accounts ({staffList?.length || 0} {allStaffList && allStaffList.length !== staffList.length && `of ${allStaffList.length}`})
                </h2>
              </div>
              <Input
                placeholder='Search by name, email, or phone...'
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
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>Name</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>Email</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>Phone</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>Status</th>
                        <th className='text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider'>Created</th>
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
                              {staff.status}
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
                  {searchTerm ? 'No staff accounts match your search' : 'No staff accounts found'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


