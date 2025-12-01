import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { toast } from 'react-toastify'
import adminApi from '../../../../apis/admin.api'
import Skeleton from '../../../../components/Skeleton'
import logger from '../../../../utils/logger'
import AdminPageContainer from '../../AdminPageContainer'
import AdminPageHeader from '../../AdminPageHeader'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// Validation schema
const createTechnicianSchema = yup.object({
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

interface CreateTechnicianForm {
  fullName: string
  email: string
  phoneNumber: string
  password: string
}

export default function CreateTechnician() {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(createTechnicianSchema)
  })

  // Query to get all technicians
  const { data: allTechnicianList, isLoading } = useQuery({
    queryKey: ['admin', 'technicians'],
    queryFn: () => adminApi.getAllTechnicians().then((res) => res.data?.data || [])
  })

  // Filter technicians by search term
  const technicianList = useMemo(() => {
    if (!searchTerm.trim()) return allTechnicianList || []
    const searchLower = searchTerm.toLowerCase()
    return (allTechnicianList || []).filter(
      (technician: any) =>
        technician.fullName?.toLowerCase().includes(searchLower) ||
        technician.email?.toLowerCase().includes(searchLower) ||
        technician.phoneNumber?.toLowerCase().includes(searchLower)
    )
  }, [allTechnicianList, searchTerm])

  // Mutation to create technician
  const createTechnicianMutation = useMutation({
    mutationFn: (data: CreateTechnicianForm) => adminApi.createTechnician(data),
    onSuccess: () => {
      toast.success('Technician account created successfully!')
      reset()
      queryClient.invalidateQueries({ queryKey: ['admin', 'technicians'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create technician account'
      toast.error(message)
      logger.error('Create technician error:', error)
    }
  })

  const onSubmit = (data: CreateTechnicianForm) => {
    createTechnicianMutation.mutate(data)
  }

  if (isLoading) return <Skeleton />

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow='Contracts & Team'
        title='Create Technician Account'
        subtitle='Create a new technician account for vehicle maintenance'
      />

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Create Form */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-xl shadow-lg p-6'>
              <h2 className='text-xl font-semibold text-gray-800 mb-4'>New Technician Account</h2>
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                {/* Full Name */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Full Name</label>
                  <input
                    {...register('fullName')}
                    type='text'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
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
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
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
                  disabled={createTechnicianMutation.isPending}
                  className='w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  {createTechnicianMutation.isPending ? 'Creating...' : 'Create Technician Account'}
                </button>
              </form>
            </div>
          </div>

          {/* Technician List */}
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-xl shadow-lg p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-gray-800'>
                  Technician Accounts ({technicianList?.length || 0} {allTechnicianList && allTechnicianList.length !== technicianList.length && `of ${allTechnicianList.length}`})
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
              {technicianList && technicianList.length > 0 ? (
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
                      {technicianList.map((technician: any) => (
                        <tr key={technician.userId} className='hover:bg-gray-50 transition-colors'>
                          <td className='py-3 px-4 text-sm font-medium text-gray-900'>{technician.fullName}</td>
                          <td className='py-3 px-4 text-sm text-gray-600'>{technician.email}</td>
                          <td className='py-3 px-4 text-sm text-gray-600'>{technician.phoneNumber || '-'}</td>
                          <td className='py-3 px-4'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                technician.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {technician.status}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-sm text-gray-500'>
                            {new Date(technician.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200'>
                  {searchTerm ? 'No technician accounts match your search' : 'No technician accounts found'}
                </div>
              )}
            </div>
          </div>
        </div>
    </AdminPageContainer>
  )
}


