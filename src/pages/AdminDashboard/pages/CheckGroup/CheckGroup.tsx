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
import AdminPageContainer from '../../AdminPageContainer'
import AdminPageHeader from '../../AdminPageHeader'
import { useI18n } from '../../../../i18n/useI18n'

const { Option } = Select
const { RangePicker } = DatePicker
const { Panel } = Collapse

export default function CheckGroup() {
  const { t } = useI18n()
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
    queryFn: () => staffApi.getAllGroupStaff(currentPage, pageSize),
    retry: 1
  })

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (groupIds: number[]) => {
      const promises = groupIds.map((id) => staffApi.updateGroupStatus(id, 'ACTIVE'))
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(t('admin_check_group_bulk_approve_success', { count: selectedGroupIds.size }))
      setSelectedGroupIds(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['groupList'] })
    },
    onError: () => {
      message.error(t('admin_check_group_bulk_approve_error'))
    }
  })

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ groupIds, reason }: { groupIds: number[]; reason: string }) => {
      const promises = groupIds.map((id) => staffApi.updateGroupStatus(id, 'INACTIVE', reason))
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(t('admin_check_group_bulk_reject_success', { count: selectedGroupIds.size }))
      setSelectedGroupIds(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['groupList'] })
    },
    onError: () => {
      message.error(t('admin_check_group_bulk_reject_error'))
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
      title: t('admin_check_group_bulk_approve_title'),
      content: t('admin_check_group_bulk_approve_content', { count: selectedGroupIds.size }),
      onOk: () => {
        bulkApproveMutation.mutate(Array.from(selectedGroupIds))
      }
    })
  }

  const handleBulkReject = () => {
    Modal.confirm({
      title: t('admin_check_group_bulk_reject_title'),
      content: (
        <div className='mt-4'>
          <p className='mb-2'>{t('admin_check_group_bulk_reject_content', { count: selectedGroupIds.size })}</p>
          <Input.TextArea
            id='rejection-reason'
            rows={3}
            placeholder={t('admin_check_group_rejection_reason_placeholder')}
            required
          />
        </div>
      ),
      okText: t('admin_check_group_reject_button'),
      okButtonProps: { danger: true },
      onOk: (close) => {
        const reasonInput = document.getElementById('rejection-reason') as HTMLTextAreaElement
        const reason = reasonInput?.value?.trim()
        if (!reason) {
          message.error(t('admin_check_group_rejection_reason_required'))
          return Promise.reject()
        }
        bulkRejectMutation.mutate({ groupIds: Array.from(selectedGroupIds), reason })
        close()
      }
    })
  }

  const { isPending, isError, error, refetch } = groupListQuery

  const allGroupData: groupStaffItem[] = groupListQuery.data?.data?.content || []

  // Create stable key for allGroupData to prevent unnecessary re-computations
  const allGroupDataKey = useMemo(() => {
    if (allGroupData.length === 0) return 'empty'
    return JSON.stringify(allGroupData.map(g => ({ id: g.groupId, status: g.status, name: g.groupName })))
  }, [allGroupData])

  // Create stable key for dateRange to prevent unnecessary re-computations
  const dateRangeKey = useMemo(() => {
    if (!dateRange[0] || !dateRange[1]) return 'no-range'
    return `${dateRange[0].format('YYYY-MM-DD')}-${dateRange[1].format('YYYY-MM-DD')}`
  }, [dateRange])

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
  }, [allGroupData, allGroupDataKey, statusFilter, searchTerm, dateRange, dateRangeKey, minMembers, maxMembers])

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

  // Create stable key for filteredGroups to prevent unnecessary re-computations
  const filteredGroupsKey = useMemo(() => {
    if (filteredGroups.length === 0) return 'empty'
    return JSON.stringify(filteredGroups.map(g => ({ id: g.groupId, status: g.status })))
  }, [filteredGroups])

  const statusCounts = useMemo(() => {
    return filteredGroups.reduce(
      (acc, group) => {
        acc[group.status] = (acc[group.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [filteredGroupsKey])

  const summaryMetrics = [
    {
      label: t('admin_check_group_summary_pending'),
      value: statusCounts.PENDING || 0,
      accent: 'bg-amber-50 text-amber-600 border-amber-100'
    },
    {
      label: t('admin_check_group_summary_active'),
      value: statusCounts.ACTIVE || 0,
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      label: t('admin_check_group_summary_inactive'),
      value: (statusCounts.INACTIVE || 0) + (statusCounts.CLOSED || 0),
      accent: 'bg-slate-50 text-slate-600 border-slate-100'
    },
    {
      label: t('admin_check_group_summary_total'),
      value: totalFiltered,
      accent: 'bg-blue-50 text-blue-600 border-blue-100'
    }
  ]

  // Create stable key for selectedGroup to prevent unnecessary re-computations
  const selectedGroupKey = useMemo(() => {
    if (!selectedGroup) return null
    return JSON.stringify({ id: selectedGroup.groupId, status: selectedGroup.status, updatedAt: selectedGroup.updatedAt })
  }, [selectedGroup])

  // Activity timeline data - MUST be at top level, not inside JSX
  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!selectedGroup) return []
    
    const activities: ActivityItem[] = []
    if (selectedGroup.createdAt) {
      activities.push({
        id: 'create',
        type: 'CREATE',
        title: t('admin_check_group_activity_created_title'),
        description: t('admin_check_group_activity_created_desc', { groupName: selectedGroup.groupName }),
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
        title: t('admin_check_group_activity_updated_title'),
        description: t('admin_check_group_activity_updated_desc'),
        timestamp: selectedGroup.updatedAt
      })
    }
    if (selectedGroup.status === 'ACTIVE') {
      activities.push({
        id: 'approve',
        type: 'APPROVE',
        title: t('admin_check_group_activity_approved_title'),
        description: t('admin_check_group_activity_approved_desc'),
        timestamp: selectedGroup.updatedAt || selectedGroup.createdAt || new Date().toISOString()
      })
    } else if (selectedGroup.status === 'INACTIVE' && selectedGroup.rejectionReason) {
      activities.push({
        id: 'reject',
        type: 'REJECT',
        title: t('admin_check_group_activity_rejected_title'),
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
  }, [selectedGroupKey])

  useEffect(() => {
    if (!selectedGroup && groupData.length > 0) {
      setSelectedGroup(groupData[0])
    }
  }, [groupData, selectedGroup])

  if (isPending) {
    return <Skeleton />
  }

  if (isError) {
    return (
      <AdminPageContainer>
        <div className='max-w-xl mx-auto mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-center'>
          <p className='mb-3 text-base font-semibold text-red-700'>
            {t('admin_check_group_error_load')}
          </p>
          <p className='mb-4 text-sm text-red-600'>
            {error instanceof Error ? error.message : t('admin_check_group_error_check_connection')}
          </p>
          <Button type='primary' danger onClick={() => refetch()}>
            {t('admin_dashboard_retry')}
          </Button>
        </div>
      </AdminPageContainer>
    )
  }

  if (allGroupData.length === 0) {
    return (
      <AdminPageContainer>
        <EmptyState />
      </AdminPageContainer>
    )
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow={t('admin_check_group_eyebrow')}
        title={t('admin_check_group_title')}
        subtitle={t('admin_check_group_subtitle')}
      />

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
              placeholder={t('admin_check_group_search_placeholder')}
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
              <Option value='ALL'>{t('admin_check_group_status_all')}</Option>
              <Option value='PENDING'>{t('admin_check_group_status_pending')}</Option>
              <Option value='ACTIVE'>{t('admin_check_group_status_active')}</Option>
              <Option value='INACTIVE'>{t('admin_check_group_status_inactive')}</Option>
            </Select>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={hasActiveAdvancedFilters ? 'border-blue-500 text-blue-600' : ''}
              size='large'
            >
              {hasActiveAdvancedFilters && <span className='mr-1'>({t('admin_check_group_filters_active')})</span>}
              {t('admin_check_group_filters')}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className='mt-4 pt-4 border-t border-gray-200'>
              <Space direction='vertical' size='middle' className='w-full'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_check_group_filter_date_range')}</label>
                    <RangePicker
                      value={dateRange}
                      onChange={(dates) => {
                        setDateRange(dates as [Dayjs | null, Dayjs | null])
                        handleFilterChange()
                      }}
                      format='DD/MM/YYYY'
                      className='w-full'
                      placeholder={[t('admin_dashboard_range_from_date_placeholder'), t('admin_dashboard_range_to_date_placeholder')]}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_check_group_filter_min_members')}</label>
                    <InputNumber
                      value={minMembers}
                      onChange={(value) => {
                        setMinMembers(value)
                        handleFilterChange()
                      }}
                      min={1}
                      max={100}
                      placeholder={t('admin_check_group_filter_minimum')}
                      className='w-full'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_check_group_filter_max_members')}</label>
                    <InputNumber
                      value={maxMembers}
                      onChange={(value) => {
                        setMaxMembers(value)
                        handleFilterChange()
                      }}
                      min={1}
                      max={100}
                      placeholder={t('admin_check_group_filter_maximum')}
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
                    {t('admin_check_group_clear_filters')}
                  </Button>
                )}
              </Space>
            </div>
          )}

          <p className='mt-3 text-sm text-gray-500'>
            {t('admin_check_group_showing_results', {
              showing: groupData.length,
              total: totalFiltered,
              searchTerm: searchTerm ? ` "${searchTerm}"` : '',
              status: statusFilter !== 'ALL' ? ` "${statusFilter}"` : ''
            })}
          </p>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedGroupIds.size > 0 && (
          <div className='rounded-2xl bg-blue-50 border border-blue-200 p-4 mb-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-semibold text-blue-900'>
                  {t('admin_check_group_selected_count', { count: selectedGroupIds.size })}
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
                  {t('admin_check_group_bulk_approve_button')}
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  danger
                  onClick={handleBulkReject}
                  loading={bulkRejectMutation.isPending}
                >
                  {t('admin_check_group_bulk_reject_button')}
                </Button>
                <Button onClick={() => {
                  setSelectedGroupIds(new Set())
                  setShowBulkActions(false)
                }}>
                  {t('admin_check_group_clear_selection')}
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
                  {statusFilter === 'ALL' ? t('admin_check_group_all_groups') : t('admin_check_group_status_groups', { status: statusFilter })}
                </h2>
              </div>
              <Tag color='blue'>{t('admin_check_group_records_count', { count: totalFiltered })}</Tag>
            </div>
            {groupData.length === 0 ? (
              <div className='py-16 text-center text-gray-500'>
                {searchTerm || statusFilter !== 'ALL' ? t('admin_check_group_no_match') : t('admin_check_group_no_groups')}
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
                            {group.description || t('admin_check_group_no_description')}
                          </span>
                          <span className='flex items-center gap-1'>
                            <TeamOutlined className='text-indigo-500' />
                            {group.memberCapacity} {t('admin_check_group_seats')}
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
                    <p className='text-sm font-semibold uppercase tracking-wide text-gray-400'>{t('admin_check_group_selected_group')}</p>
                    <h3 className='mt-1 text-2xl font-bold text-gray-900'>{selectedGroup.groupName}</h3>
                    <p className='text-sm text-gray-500'>{t('admin_check_group_id', { id: selectedGroup.groupId })}</p>
                  </div>
                  <StatusBadge status={selectedGroup.status} />
                </div>

                <div className='rounded-xl bg-slate-50 p-4'>
                  <p className='text-sm font-semibold text-gray-600'>{t('admin_check_group_label_description')}</p>
                  <p className='mt-1 text-gray-700'>
                    {selectedGroup.description || t('admin_check_group_no_context')}
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-4 text-sm text-gray-600'>
                  <div className='rounded-xl border border-gray-100 p-3'>
                    <p className='text-xs uppercase text-gray-400'>{t('admin_check_group_label_capacity')}</p>
                    <p className='text-lg font-semibold text-indigo-600'>{selectedGroup.memberCapacity} {t('admin_check_group_members')}</p>
                  </div>
                  <div className='rounded-xl border border-gray-100 p-3'>
                    <p className='text-xs uppercase text-gray-400'>{t('admin_check_group_label_created')}</p>
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
                  <p className='text-sm font-semibold text-gray-700'>{t('admin_check_group_next_actions')}</p>
                  <div className='flex flex-wrap gap-3'>
                    <button className='flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600'>
                      {t('admin_check_group_approve_button')}
                    </button>
                    <button className='flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'>
                      {t('admin_check_group_request_details')}
                    </button>
                  </div>
                  <button className='rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50'>
                    {t('admin_check_group_reject_application')}
                  </button>
                </div>

                <div className='text-xs text-gray-400'>
                  {t('admin_check_group_tip')}
                </div>

                {/* Activity Timeline */}
                {selectedGroup && (
                  <div className='mt-6'>
                    <ActivityTimeline
                      activities={activityItems}
                      maxItems={10}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className='flex h-full flex-col items-center justify-center text-center text-gray-400'>
                <p className='text-sm'>{t('admin_check_group_select_to_view')}</p>
              </div>
            )}
          </div>
        </div>
    </AdminPageContainer>
  )
}
