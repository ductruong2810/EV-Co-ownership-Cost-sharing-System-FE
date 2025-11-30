import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Input, Select, Tag, DatePicker, InputNumber, Collapse, Button, Space, Checkbox, Modal, message } from 'antd'
import { SearchOutlined, FilterOutlined, ClearOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import staffApi from '../../../../apis/staff.api'
import type { groupStaffItem } from '../../../../types/api/staff.type'
import PaginationButton from './components/PaginationButton'
import StatusBadge from './components/StatusBadge'
import Skeleton from '../../../../components/Skeleton'
import EmptyState from '../EmptyState'
import { InfoCircleOutlined, RightOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import ActivityTimeline, { type ActivityItem } from '../../../../components/ActivityTimeline'

const { Option } = Select
const { RangePicker } = DatePicker
const { Panel } = Collapse

export default function CheckGroup() {
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10 // fixed page size
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  
  // Advanced filters
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [minMembers, setMinMembers] = useState<number | null>(null)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [selectedGroup, setSelectedGroup] = useState<groupStaffItem | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  const queryClient = useQueryClient()

  const groupListQuery = useQuery({
    queryKey: ['groupList', { page: currentPage, size: pageSize }],
    // keep previous page data while fetching the next one
    queryFn: () => staffApi.getAllGroupStaff(currentPage, pageSize)
  })

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (groupIds: number[]) => {
      const promises = groupIds.map((id) => staffApi.updateGroupStatus(id, 'ACTIVE'))
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(`Successfully approved ${selectedGroupIds.size} group(s)`)
      setSelectedGroupIds(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['groupList'] })
    },
    onError: () => {
      message.error('Failed to approve some groups. Please try again.')
    }
  })

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ groupIds, reason }: { groupIds: number[]; reason: string }) => {
      const promises = groupIds.map((id) => staffApi.updateGroupStatus(id, 'INACTIVE', reason))
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(`Successfully rejected ${selectedGroupIds.size} group(s)`)
      setSelectedGroupIds(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['groupList'] })
    },
    onError: () => {
      message.error('Failed to reject some groups. Please try again.')
    }
  })

  const handleSelectGroup = (groupId: number, checked: boolean) => {
    const newSelected = new Set(selectedGroupIds)
    if (checked) {
      newSelected.add(groupId)
    } else {
      newSelected.delete(groupId)
    }
    setSelectedGroupIds(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(groupData.map((g) => g.groupId))
      setSelectedGroupIds(allIds)
      setShowBulkActions(true)
    } else {
      setSelectedGroupIds(new Set())
      setShowBulkActions(false)
    }
  }

  const handleBulkApprove = () => {
    Modal.confirm({
      title: 'Approve Selected Groups',
      content: `Are you sure you want to approve ${selectedGroupIds.size} group(s)?`,
      onOk: () => {
        bulkApproveMutation.mutate(Array.from(selectedGroupIds))
      }
    })
  }

  const handleBulkReject = () => {
    Modal.confirm({
      title: 'Reject Selected Groups',
      content: (
        <div className='mt-4'>
          <p className='mb-2'>Please provide a reason for rejecting {selectedGroupIds.size} group(s):</p>
          <Input.TextArea
            id='rejection-reason'
            rows={3}
            placeholder='Enter rejection reason...'
            required
          />
        </div>
      ),
      okText: 'Reject',
      okButtonProps: { danger: true },
      onOk: (close) => {
        const reasonInput = document.getElementById('rejection-reason') as HTMLTextAreaElement
        const reason = reasonInput?.value?.trim()
        if (!reason) {
          message.error('Rejection reason is required')
          return Promise.reject()
        }
        bulkRejectMutation.mutate({ groupIds: Array.from(selectedGroupIds), reason })
        close()
      }
    })
  }

  const { isPending } = groupListQuery

  const allGroupData: groupStaffItem[] = groupListQuery.data?.data?.content || []

  // Filter and search logic
  const filteredGroups = useMemo(() => {
    let filtered = allGroupData

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((group) => group.status === statusFilter)
    }

    // Search by name, description, or ID
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (group) =>
          group.groupName.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower) ||
          group.groupId.toString().includes(searchTerm)
      )
    }

    // Filter by date range (createdAt)
    if (dateRange[0] && dateRange[1] && allGroupData.length > 0) {
      filtered = filtered.filter((group) => {
        if (!group.createdAt) return false
        const createdAt = dayjs(group.createdAt)
        return createdAt.isAfter(dateRange[0]!.subtract(1, 'day')) && createdAt.isBefore(dateRange[1]!.add(1, 'day'))
      })
    }

    // Filter by member capacity range
    if (minMembers !== null && minMembers > 0) {
      filtered = filtered.filter((group) => group.memberCapacity >= minMembers)
    }
    if (maxMembers !== null && maxMembers > 0) {
      filtered = filtered.filter((group) => group.memberCapacity <= maxMembers)
    }

    return filtered
  }, [allGroupData, statusFilter, searchTerm, dateRange, minMembers, maxMembers])

  const hasActiveAdvancedFilters = dateRange[0] || dateRange[1] || minMembers !== null || maxMembers !== null

  const clearAdvancedFilters = () => {
    setDateRange([null, null])
    setMinMembers(null)
    setMaxMembers(null)
    handleFilterChange()
  }

  // Pagination for filtered results
  const totalFiltered = filteredGroups.length
  const startIndex = currentPage * pageSize
  const endIndex = startIndex + pageSize
  const groupData = filteredGroups.slice(startIndex, endIndex)
  const totalPages = Math.ceil(totalFiltered / pageSize)
  const pageNumber = currentPage

  // Reset to first page when filter/search changes
  const handleFilterChange = () => {
    setCurrentPage(0)
  }

  // handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage - 1) // Convert to 0-based
  }

  const statusCounts = useMemo(() => {
    return filteredGroups.reduce(
      (acc, group) => {
        acc[group.status] = (acc[group.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [filteredGroups])

  const summaryMetrics = [
    {
      label: 'Pending review',
      value: statusCounts.PENDING || 0,
      accent: 'bg-amber-50 text-amber-600 border-amber-100'
    },
    {
      label: 'Active groups',
      value: statusCounts.ACTIVE || 0,
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      label: 'Inactive / Closed',
      value: (statusCounts.INACTIVE || 0) + (statusCounts.CLOSED || 0),
      accent: 'bg-slate-50 text-slate-600 border-slate-100'
    },
    {
      label: 'Total listed',
      value: totalFiltered,
      accent: 'bg-blue-50 text-blue-600 border-blue-100'
    }
  ]

  useEffect(() => {
    if (!selectedGroup && groupData.length > 0) {
      setSelectedGroup(groupData[0])
    }
  }, [groupData, selectedGroup])

  if (isPending) {
    return <Skeleton />
  }

  if (allGroupData.length === 0) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6'>
        <div className='max-w-6xl mx-auto'>
          <EmptyState />
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6'>
      <div className='mx-auto flex w-full max-w-6xl flex-col gap-6'>
        <header className='flex flex-col gap-2'>
          <p className='text-sm font-semibold uppercase tracking-wider text-indigo-400'>Staff workspace</p>
          <h1 className='text-3xl font-bold text-gray-900'>Group approvals</h1>
          <p className='text-gray-600'>
            Review and approve new co-ownership groups. Use the filters to prioritise pending submissions.
          </p>
        </header>

        {/* Summary */}
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${metric.accent}`}>
              <p className='text-xs uppercase tracking-wide text-gray-400'>{metric.label}</p>
              <p className='mt-1 text-2xl'>{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className='rounded-2xl bg-white p-5 shadow-sm'>
          <div className='flex flex-col gap-3 md:flex-row'>
            <Input
              placeholder='Search by group name, description, or ID...'
              prefix={<SearchOutlined className='text-gray-400' />}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                handleFilterChange()
              }}
              allowClear
              className='flex-1'
              size='large'
            />
            <Select
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                handleFilterChange()
              }}
              className='w-full md:w-52'
              size='large'
            >
              <Option value='ALL'>All Status</Option>
              <Option value='PENDING'>Pending</Option>
              <Option value='ACTIVE'>Active</Option>
              <Option value='INACTIVE'>Inactive</Option>
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
            <div className='mt-4 pt-4 border-t border-gray-200'>
              <Space direction='vertical' size='middle' className='w-full'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Created Date Range</label>
                    <RangePicker
                      value={dateRange}
                      onChange={(dates) => {
                        setDateRange(dates as [Dayjs | null, Dayjs | null])
                        handleFilterChange()
                      }}
                      format='DD/MM/YYYY'
                      className='w-full'
                      placeholder={['From date', 'To date']}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Min Members</label>
                    <InputNumber
                      value={minMembers}
                      onChange={(value) => {
                        setMinMembers(value)
                        handleFilterChange()
                      }}
                      min={1}
                      max={100}
                      placeholder='Minimum'
                      className='w-full'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Max Members</label>
                    <InputNumber
                      value={maxMembers}
                      onChange={(value) => {
                        setMaxMembers(value)
                        handleFilterChange()
                      }}
                      min={1}
                      max={100}
                      placeholder='Maximum'
                      className='w-full'
                    />
                  </div>
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

          <p className='mt-3 text-sm text-gray-500'>
            Showing {groupData.length} of {totalFiltered} groups
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}
          </p>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedGroupIds.size > 0 && (
          <div className='rounded-2xl bg-blue-50 border border-blue-200 p-4 mb-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-semibold text-blue-900'>
                  {selectedGroupIds.size} group(s) selected
                </span>
              </div>
              <Space>
                <Button
                  icon={<CheckOutlined />}
                  type='primary'
                  onClick={handleBulkApprove}
                  loading={bulkApproveMutation.isPending}
                  className='bg-emerald-600 hover:bg-emerald-700'
                >
                  Approve Selected
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  danger
                  onClick={handleBulkReject}
                  loading={bulkRejectMutation.isPending}
                >
                  Reject Selected
                </Button>
                <Button onClick={() => {
                  setSelectedGroupIds(new Set())
                  setShowBulkActions(false)
                }}>
                  Clear Selection
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* Main panel */}
        <div className='grid gap-6 lg:grid-cols-[1.65fr,1fr]'>
          <div className='rounded-2xl bg-white shadow-sm'>
            <div className='flex items-center justify-between border-b px-5 py-4'>
              <div className='flex items-center gap-3'>
                <Checkbox
                  checked={groupData.length > 0 && groupData.every((g) => selectedGroupIds.has(g.groupId))}
                  indeterminate={
                    selectedGroupIds.size > 0 && selectedGroupIds.size < groupData.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <h2 className='text-lg font-semibold text-gray-800'>
                  {statusFilter === 'ALL' ? 'All groups' : `${statusFilter} groups`}
                </h2>
              </div>
              <Tag color='blue'>{totalFiltered} records</Tag>
            </div>
            {groupData.length === 0 ? (
              <div className='py-16 text-center text-gray-500'>
                {searchTerm || statusFilter !== 'ALL' ? 'No groups match your filters' : 'No groups found'}
              </div>
            ) : (
              <div className='divide-y'>
                {groupData.map((group, index) => {
                  const isActive = selectedGroup?.groupId === group.groupId
                  const isSelected = selectedGroupIds.has(group.groupId)
                  return (
                    <div
                      key={group.groupId}
                      className={`flex items-start gap-3 px-5 py-4 transition-all ${
                        isActive ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectGroup(group.groupId, e.target.checked)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className='mt-1'
                      />
                      <button
                        onClick={() => setSelectedGroup(group)}
                        className='flex flex-1 items-start gap-4 text-left'
                      >
                        <div className='mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white'>
                          {index + 1 + pageNumber * pageSize}
                        </div>
                      <div className='flex flex-1 flex-col gap-2'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <div>
                            <p className='text-base font-semibold text-gray-900'>{group.groupName}</p>
                            <p className='text-xs text-gray-500'>ID #{group.groupId}</p>
                          </div>
                          <StatusBadge status={group.status} />
                        </div>
                        <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
                          <span className='flex items-center gap-1'>
                            <InfoCircleOutlined className='text-gray-400' />
                            {group.description || 'No description'}
                          </span>
                          <span className='flex items-center gap-1'>
                            <TeamOutlined className='text-indigo-500' />
                            {group.memberCapacity} seats
                          </span>
                          {group.createdAt && (
                            <span className='flex items-center gap-1 text-gray-500'>
                              <CalendarOutlined className='text-gray-400' />
                              {new Date(group.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <RightOutlined className='mt-1 text-xs text-gray-400' />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className='border-t px-5 py-4'>
                <PaginationButton
                  currentPage={pageNumber + 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>

          <div className='rounded-2xl bg-white p-6 shadow-sm'>
            {selectedGroup ? (
              <div className='space-y-5'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-semibold uppercase tracking-wide text-gray-400'>Selected group</p>
                    <h3 className='mt-1 text-2xl font-bold text-gray-900'>{selectedGroup.groupName}</h3>
                    <p className='text-sm text-gray-500'>ID #{selectedGroup.groupId}</p>
                  </div>
                  <StatusBadge status={selectedGroup.status} />
                </div>

                <div className='rounded-xl bg-slate-50 p-4'>
                  <p className='text-sm font-semibold text-gray-600'>Description</p>
                  <p className='mt-1 text-gray-700'>
                    {selectedGroup.description || 'This group has not provided additional context.'}
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-4 text-sm text-gray-600'>
                  <div className='rounded-xl border border-gray-100 p-3'>
                    <p className='text-xs uppercase text-gray-400'>Capacity</p>
                    <p className='text-lg font-semibold text-indigo-600'>{selectedGroup.memberCapacity} members</p>
                  </div>
                  <div className='rounded-xl border border-gray-100 p-3'>
                    <p className='text-xs uppercase text-gray-400'>Created</p>
                    <p className='text-lg font-semibold text-gray-800'>
                      {selectedGroup.createdAt
                        ? new Date(selectedGroup.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className='flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 p-4'>
                  <p className='text-sm font-semibold text-gray-700'>Next actions</p>
                  <div className='flex flex-wrap gap-3'>
                    <button className='flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600'>
                      Approve group
                    </button>
                    <button className='flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'>
                      Request details
                    </button>
                  </div>
                  <button className='rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50'>
                    Reject application
                  </button>
                </div>

                <div className='text-xs text-gray-400'>
                  Tip: when you approve the group we will notify all members via email + in-app notifications
                  automatically.
                </div>

                {/* Activity Timeline */}
                {selectedGroup && (
                  <div className='mt-6'>
                    <ActivityTimeline
                      activities={useMemo<ActivityItem[]>(() => {
                        const activities: ActivityItem[] = []
                        if (selectedGroup.createdAt) {
                          activities.push({
                            id: 'create',
                            type: 'CREATE',
                            title: 'Group Created',
                            description: `Group "${selectedGroup.groupName}" was created`,
                            timestamp: selectedGroup.createdAt,
                            metadata: {
                              groupId: selectedGroup.groupId,
                              memberCapacity: selectedGroup.memberCapacity
                            }
                          })
                        }
                        if (selectedGroup.updatedAt && selectedGroup.updatedAt !== selectedGroup.createdAt) {
                          activities.push({
                            id: 'update',
                            type: 'UPDATE',
                            title: 'Group Updated',
                            description: 'Group information was updated',
                            timestamp: selectedGroup.updatedAt
                          })
                        }
                        if (selectedGroup.status === 'ACTIVE') {
                          activities.push({
                            id: 'approve',
                            type: 'APPROVE',
                            title: 'Group Approved',
                            description: 'Group was approved and activated',
                            timestamp: selectedGroup.updatedAt || selectedGroup.createdAt || new Date().toISOString()
                          })
                        } else if (selectedGroup.status === 'INACTIVE' && selectedGroup.rejectionReason) {
                          activities.push({
                            id: 'reject',
                            type: 'REJECT',
                            title: 'Group Rejected',
                            description: selectedGroup.rejectionReason,
                            timestamp: selectedGroup.updatedAt || selectedGroup.createdAt || new Date().toISOString(),
                            metadata: {
                              reason: selectedGroup.rejectionReason
                            }
                          })
                        }
                        return activities.sort((a, b) => 
                          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                        )
                      }, [selectedGroup])}
                      maxItems={10}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className='flex h-full flex-col items-center justify-center text-center text-gray-400'>
                <p className='text-sm'>Select a group from the left to see more details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
