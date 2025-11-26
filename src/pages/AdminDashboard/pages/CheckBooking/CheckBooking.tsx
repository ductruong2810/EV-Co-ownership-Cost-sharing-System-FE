import { useQuery } from '@tanstack/react-query'
import { Avatar, Pagination, Input, Select } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import staffApi from '../../../../apis/staff.api'
import Skeleton from '../../../../components/Skeleton'
import type { GetGroupById, UserOfStaff } from '../../../../types/api/staff.type'
import { useNavigate } from 'react-router'
import EmptyState from '../EmptyState'

const { Option } = Select
const ITEMS_PER_PAGE = 10

export default function CheckBooking() {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [groups, setGroups] = useState<Record<number, GetGroupById[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const navigate = useNavigate()

  // Fetch users
  const { data = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await staffApi.getUsers()
      return Array.isArray(res?.data) ? res.data : []
    }
  })

  // Filter and search logic - Only show CO_OWNER users
  const filteredUsers = useMemo(() => {
    // First, filter only CO_OWNER users
    let filtered = data.filter((user: UserOfStaff) => user.roleName === 'CO_OWNER')

    // Search by name, email, or phone
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user: UserOfStaff) =>
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phoneNumber?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((user: UserOfStaff) => user.status === statusFilter)
    }

    return filtered
  }, [data, searchTerm, statusFilter])

  // Pagination
  const start = (page - 1) * ITEMS_PER_PAGE
  const users = filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  const total = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)

  // Fetch groups
  const handleExpand = async (userId: number | undefined) => {
    if (!userId) return

    // If already fetched → just toggle expand/collapse
    if (groups[userId]) {
      setExpanded(expanded === userId ? null : userId)
      return
    }

    try {
      const res = await staffApi.getAllGroupsByUserId(userId)
      setGroups((prev) => ({
        ...prev,
        [userId]: Array.isArray(res?.data) ? res.data : []
      }))
      setExpanded(userId)
    } catch (err) {
      console.error('Error:', err)
      setGroups((prev) => ({ ...prev, [userId]: [] }))
      setExpanded(userId)
    }
  }

  // Helpers
  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const moveToBookingQrPage = ({ userId, groupId }: { userId: number; groupId: number }) => {
    navigate(`/manager/bookingQr/${userId}/${groupId}`)
  }

  // Render
  if (isLoading) return <Skeleton />
  if (!data.length) return <EmptyState />

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6'>
      <div className='max-w-6xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Booking Management</h1>
          <p className='text-gray-600'>
            Manage bookings by co-owners • Total {filteredUsers.length} of {data.length} users • Page {page}/{total}
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className='mb-6 flex flex-col sm:flex-row gap-4'>
          <Input
            placeholder='Search by name, email, or phone...'
            prefix={<SearchOutlined className='text-gray-400' />}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            allowClear
            className='flex-1'
            size='large'
          />
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            className='w-full sm:w-40'
            size='large'
          >
            <Option value='ALL'>All Status</Option>
            <Option value='ACTIVE'>Active</Option>
            <Option value='INACTIVE'>Inactive</Option>
            <Option value='BANNED'>Banned</Option>
          </Select>
        </div>

        {/* Results count */}
        {filteredUsers.length !== data.filter((u: UserOfStaff) => u.roleName === 'CO_OWNER').length && (
          <div className='mb-4 text-sm text-gray-600'>
            Showing {filteredUsers.length} of {data.filter((u: UserOfStaff) => u.roleName === 'CO_OWNER').length} co-owners
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}
          </div>
        )}

        {/* Users List */}
        <div className='space-y-3'>
          {users.length === 0 ? (
            <div className='text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200'>
              {searchTerm || statusFilter !== 'ALL' ? 'No co-owners match your filters' : 'No co-owners found'}
            </div>
          ) : (
            users.map((user: UserOfStaff) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition'
            >
              {/* User Row */}
              <div
                onClick={() => handleExpand(user.userId)}
                className='flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50'
              >
                <div className='flex items-center gap-3 flex-1'>
                  <Avatar size={40} className='bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0'>
                    {getInitials(user.fullName)}
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-sm truncate'>{user.fullName}</p>
                    <div className='flex items-center gap-2 mt-1'>
                      <p className='text-xs text-gray-600 truncate'>{user.email}</p>
                      {user.phoneNumber && (
                        <>
                          <span className='text-xs text-gray-400'>•</span>
                          <p className='text-xs text-gray-600'>{user.phoneNumber}</p>
                        </>
                      )}
                    </div>
                    <div className='flex items-center gap-2 mt-1'>
                      {user.roleName && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            user.roleName === 'CO_OWNER'
                              ? 'bg-blue-100 text-blue-800'
                              : user.roleName === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.roleName}
                        </span>
                      )}
                      {user.status && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'INACTIVE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.status}
                        </span>
                      )}
                           {user.createdAt && (
                             <>
                               <span className='text-xs text-gray-400'>•</span>
                               <p className='text-xs text-gray-500'>
                                 Joined: {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                               </p>
                             </>
                           )}
                    </div>
                  </div>
                </div>

                {/* Chevron */}
                <motion.svg
                  animate={{ rotate: expanded === user.userId ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className='w-5 h-5 text-gray-400 flex-shrink-0'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </motion.svg>
              </div>

              {/* Groups Dropdown */}
              {expanded === user.userId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className='border-t border-gray-100'
                >
                  <div className='p-4 bg-blue-50 space-y-2'>
                    {groups[user.userId || 0]?.length > 0 ? (
                      groups[user.userId || 0].map((group, idx) => (
                        <motion.div
                          key={group.groupId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className='bg-white border border-blue-200 rounded-lg p-3 hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer'
                          onClick={() =>
                            moveToBookingQrPage({
                              userId: user.userId as number,
                              groupId: group.groupId
                            })
                          }
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2 mb-1'>
                                <p className='text-sm font-semibold text-blue-900'>{group.groupName}</p>
                                <span className='bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium'>
                                  #{group.groupId}
                                </span>
                              </div>
                              <div className='flex items-center gap-3 text-xs text-gray-600 flex-wrap'>
                                {group.bookings && group.bookings.length > 0 ? (
                                  <>
                                    <span className='flex items-center gap-1'>
                                      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                                        <path d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' />
                                        <path
                                          fillRule='evenodd'
                                          d='M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z'
                                          clipRule='evenodd'
                                        />
                                      </svg>
                                      <span className='font-medium text-blue-700'>
                                        {group.bookings.length} {group.bookings.length === 1 ? 'booking' : 'bookings'}
                                      </span>
                                    </span>
                                    {group.bookings[0] && (
                                      <span className='text-gray-500'>
                                        Latest: {new Date(group.bookings[0].startDateTime).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className='text-gray-400 italic'>No bookings yet</span>
                                )}
                              </div>
                            </div>
                            <div className='text-blue-600 ml-2'>
                              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                              </svg>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className='text-sm text-gray-500 text-center py-2'>No groups</p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > 1 && (
          <div className='mt-8 flex justify-center'>
            <Pagination
              current={page}
              total={data.length}
              pageSize={ITEMS_PER_PAGE}
              onChange={(p) => {
                setPage(p)
                setExpanded(null)
              }}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
