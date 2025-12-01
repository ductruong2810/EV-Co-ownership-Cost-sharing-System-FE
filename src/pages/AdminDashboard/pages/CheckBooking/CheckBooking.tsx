import { useQuery } from '@tanstack/react-query'
import { Avatar, Pagination, Input, Select, Tag, DatePicker, Button, Space } from 'antd'
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import staffApi from '../../../../apis/staff.api'
import Skeleton from '../../../../components/Skeleton'
import type { GetGroupById, UserOfStaff } from '../../../../types/api/staff.type'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../EmptyState'
import dayjs, { Dayjs } from 'dayjs'
import AdminPageContainer from '../../AdminPageContainer'

const { Option } = Select
const { RangePicker } = DatePicker
const ITEMS_PER_PAGE = 10

export default function CheckBooking() {
  const [page, setPage] = useState(1)
  const [groups, setGroups] = useState<Record<number, GetGroupById[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  
  // Advanced filters
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

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

    // Filter by date range (createdAt)
    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((user: UserOfStaff) => {
        if (!user.createdAt) return false
        const createdAt = dayjs(user.createdAt)
        return createdAt.isAfter(dateRange[0]!.subtract(1, 'day')) && createdAt.isBefore(dateRange[1]!.add(1, 'day'))
      })
    }

    return filtered
  }, [data, searchTerm, statusFilter, dateRange])

  const hasActiveAdvancedFilters = dateRange[0] || dateRange[1]

  const clearAdvancedFilters = () => {
    setDateRange([null, null])
  }

  // Pagination
  const start = (page - 1) * ITEMS_PER_PAGE
  const users = filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  const total = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)

  // Fetch groups
  const loadGroups = async (userId?: number) => {
    if (!userId || groups[userId]) return
    try {
      const res = await staffApi.getAllGroupsByUserId(userId)
      setGroups((prev) => ({
        ...prev,
        [userId]: Array.isArray(res?.data) ? res.data : []
      }))
    } catch (err) {
      console.error('Error:', err)
      setGroups((prev) => ({ ...prev, [userId]: [] }))
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

  const summary = useMemo(() => {
    const coOwners = data.filter((user: UserOfStaff) => user.roleName === 'CO_OWNER')
    const active = coOwners.filter((u) => u.status === 'ACTIVE').length
    const inactive = coOwners.filter((u) => u.status === 'INACTIVE').length
    const banned = coOwners.filter((u) => u.status === 'BANNED').length
    return { total: coOwners.length, active, inactive, banned }
  }, [data])

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId(null)
      return
    }
    if (!selectedUserId || !filteredUsers.some((u: UserOfStaff) => u.userId === selectedUserId)) {
      const first = filteredUsers[0] as UserOfStaff
      setSelectedUserId(first.userId || null)
      loadGroups(first.userId)
    } else {
      loadGroups(selectedUserId)
    }
  }, [filteredUsers, selectedUserId])

  const selectedUser = filteredUsers.find((u: UserOfStaff) => u.userId === selectedUserId)

  // Render
  if (isLoading) return <Skeleton />
  if (!data.length) {
    return (
      <AdminPageContainer>
        <EmptyState />
      </AdminPageContainer>
    )
  }

  return (
    <AdminPageContainer>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Booking Management</h1>
          <p className='text-gray-600'>
            Manage bookings by co-owners • Total {filteredUsers.length} of {data.length} users • Page {page}/{total}
          </p>
        </div>

        <div className='mb-6 grid gap-3 md:grid-cols-4'>
          <SummaryCard
            label='Total co-owners'
            value={summary.total}
            accent='bg-blue-50 text-blue-700 border-blue-100'
          />
          <SummaryCard
            label='Active'
            value={summary.active}
            accent='bg-emerald-50 text-emerald-700 border-emerald-100'
          />
          <SummaryCard label='Inactive' value={summary.inactive} accent='bg-amber-50 text-amber-700 border-amber-100' />
          <SummaryCard label='Banned' value={summary.banned} accent='bg-rose-50 text-rose-700 border-rose-100' />
        </div>

        {/* Search and Filter Section */}
        <div className='mb-6 space-y-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
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
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={hasActiveAdvancedFilters ? 'border-blue-500 text-blue-600' : ''}
              size='large'
            >
              {hasActiveAdvancedFilters && <span className='mr-1'>(Active)</span>}
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className='rounded-2xl bg-white border border-gray-200 p-4'>
              <Space direction='vertical' size='middle' className='w-full'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Account Created Date Range</label>
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      setDateRange(dates as [Dayjs | null, Dayjs | null])
                      setPage(1)
                    }}
                    format='DD/MM/YYYY'
                    className='w-full'
                    placeholder={['From date', 'To date']}
                  />
                </div>
                {hasActiveAdvancedFilters && (
                  <Button
                    icon={<ClearOutlined />}
                    onClick={clearAdvancedFilters}
                    size='small'
                    type='text'
                    danger
                  >
                    Clear all filters
                  </Button>
                )}
              </Space>
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredUsers.length !== data.filter((u: UserOfStaff) => u.roleName === 'CO_OWNER').length && (
          <div className='mb-4 text-sm text-gray-600'>
            Showing {filteredUsers.length} of {data.filter((u: UserOfStaff) => u.roleName === 'CO_OWNER').length}{' '}
            co-owners
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}
          </div>
        )}

        {/* Users + detail */}
        {users.length === 0 ? (
          <div className='text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200'>
            {searchTerm || statusFilter !== 'ALL' ? 'No co-owners match your filters' : 'No co-owners found'}
          </div>
        ) : (
          <div className='grid gap-4 lg:grid-cols-[1.1fr,1.9fr]'>
            <div className='space-y-2'>
              {users.map((user: UserOfStaff) => {
                const isActive = user.userId === selectedUserId
                return (
                  <button
                    key={user.userId}
                    onClick={() => {
                      setSelectedUserId(user.userId || null)
                      loadGroups(user.userId)
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-indigo-400 bg-indigo-50/60 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <Avatar size={40} className='bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0'>
                        {getInitials(user.fullName)}
                      </Avatar>
                      <div className='flex-1'>
                        <p className='font-semibold text-sm text-gray-900'>{user.fullName}</p>
                        <p className='text-xs text-gray-500 truncate'>{user.email}</p>
                        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                          <Tag color='blue'>{user.roleName}</Tag>
                          <Tag
                            color={user.status === 'ACTIVE' ? 'green' : user.status === 'INACTIVE' ? 'red' : 'orange'}
                          >
                            {user.status}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}

              {total > 1 && (
                <div className='pt-4'>
                  <Pagination
                    current={page}
                    total={filteredUsers.length}
                    pageSize={ITEMS_PER_PAGE}
                    onChange={(p) => setPage(p)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>

            <div className='rounded-2xl border border-gray-100 bg-white p-5 shadow-sm'>
              {selectedUser ? (
                <>
                  <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
                    <div>
                      <p className='text-xs uppercase tracking-wide text-gray-400'>Selected co-owner</p>
                      <h2 className='text-2xl font-bold text-gray-900'>{selectedUser.fullName}</h2>
                      <p className='text-sm text-gray-500'>{selectedUser.email}</p>
                    </div>
                    <div className='text-right text-sm text-gray-500'>
                      Joined{' '}
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-US') : '—'}
                    </div>
                  </div>
                  <div className='mt-4 space-y-3'>
                    {(groups[selectedUser.userId || 0] || []).length === 0 ? (
                      <div className='rounded-xl border border-dashed border-gray-200 py-10 text-center text-gray-400'>
                        {groups[selectedUser.userId || 0]
                          ? 'No groups or bookings found for this user.'
                          : 'Fetching groups...'}
                      </div>
                    ) : (
                      groups[selectedUser.userId || 0].map((group) => (
                        <div key={group.groupId} className='rounded-2xl border border-gray-100 bg-slate-50 p-4'>
                          <div className='flex flex-wrap items-center justify-between gap-3'>
                            <div>
                              <p className='text-base font-semibold text-gray-900'>{group.groupName}</p>
                              <p className='text-xs text-gray-500'>Group #{group.groupId}</p>
                            </div>
                            <button
                              onClick={() =>
                                moveToBookingQrPage({
                                  userId: selectedUser.userId as number,
                                  groupId: group.groupId
                                })
                              }
                              className='rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50'
                            >
                              Review bookings
                            </button>
                          </div>
                          <div className='mt-3 space-y-2'>
                            {(group.bookings || []).length === 0 ? (
                              <p className='text-xs text-gray-400'>No bookings yet.</p>
                            ) : (
                              group.bookings?.map((booking) => (
                                <div key={booking.bookingId} className='rounded-xl bg-white p-3 text-sm shadow-sm'>
                                  <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <p className='font-semibold text-gray-900'>Booking #{booking.bookingId}</p>
                                    <Tag color={booking.status === 'CONFIRMED' ? 'green' : 'orange'}>
                                      {booking.status}
                                    </Tag>
                                  </div>
                                  <p className='text-xs text-gray-500'>
                                    {new Date(booking.startDateTime).toLocaleString()} →{' '}
                                    {new Date(booking.endDateTime).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className='flex h-full items-center justify-center text-gray-400'>
                  Select a co-owner to view bookings.
                </div>
              )}
            </div>
          </div>
        )}

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
    </AdminPageContainer>
  )
}

const SummaryCard = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${accent}`}>
    <p className='text-[11px] uppercase tracking-wide text-gray-400'>{label}</p>
    <p className='mt-1 text-2xl'>{value}</p>
  </div>
)
