import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Select, Input, DatePicker, Collapse, Button, Space, Checkbox, Modal, message } from 'antd'
import { SearchOutlined, FilterOutlined, ClearOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import disputeApi from '../../../../apis/dispute.api'
import staffApi from '../../../../apis/staff.api'
import type { DisputeSummary } from '../../../../types/api/dispute.type'
import type { groupStaffItem } from '../../../../types/api/staff.type'
import Skeleton from '../../../../components/Skeleton'
import EmptyState from '../EmptyState/EmptyState'
import path from '../../../../constants/path'
import AdminPageContainer from '../../AdminPageContainer'

const { Option } = Select
const { RangePicker } = DatePicker
const { Panel } = Collapse

const statusColors: Record<string, string> = {
  OPEN: 'orange',
  IN_REVIEW: 'blue',
  RESOLVED: 'green',
  REJECTED: 'red'
}

const statusColumns = [
  { key: 'OPEN', label: 'Open', accent: 'bg-orange-50 border-orange-100' },
  { key: 'IN_REVIEW', label: 'In review', accent: 'bg-blue-50 border-blue-100' },
  { key: 'RESOLVED', label: 'Resolved', accent: 'bg-emerald-50 border-emerald-100' },
  { key: 'REJECTED', label: 'Rejected', accent: 'bg-rose-50 border-rose-100' }
]

const DisputeList = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Basic filters
  // Mặc định hiển thị tất cả trạng thái
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Advanced filters
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [groupIdFilter, setGroupIdFilter] = useState<number | undefined>(undefined)
  const [disputeTypeFilter, setDisputeTypeFilter] = useState<string>('ALL')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Bulk selection
  const [selectedDisputeIds, setSelectedDisputeIds] = useState<Set<number>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Preview selected dispute
  const [previewDisputeId, setPreviewDisputeId] = useState<number | null>(null)

  // Fetch groups for filter dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-for-filter'],
    queryFn: () => staffApi.getAllGroupStaff(0, 1000),
    staleTime: 1000 * 60 * 5 // Cache for 5 minutes
  })

  const groups: groupStaffItem[] = groupsData?.data?.content || []

  // Build query params
  const queryParams = useMemo(() => {
    const params: {
      status?: string
      disputeType?: string
      groupId?: number
      from?: string
      to?: string
      page: number
      size: number
    } = {
      page: 0,
      size: 200
    }

    if (statusFilter !== 'ALL') {
      params.status = statusFilter
    }

    if (disputeTypeFilter !== 'ALL') {
      params.disputeType = disputeTypeFilter
    }

    if (groupIdFilter) {
      params.groupId = groupIdFilter
    }

    if (dateRange[0] && dateRange[1]) {
      params.from = dateRange[0].startOf('day').toISOString()
      params.to = dateRange[1].endOf('day').toISOString()
    }

    return params
  }, [statusFilter, disputeTypeFilter, groupIdFilter, dateRange])

  // Fetch disputes with filters
  const { data, isLoading } = useQuery({
    queryKey: ['disputes', queryParams],
    queryFn: () => disputeApi.list(queryParams)
  })

  const disputes: DisputeSummary[] = data?.data.content || []

  // Client-side search filter
  const filtered = useMemo(() => {
    let result = disputes

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(term) ||
          d.groupName?.toLowerCase().includes(term) ||
          d.reporterName?.toLowerCase().includes(term) ||
          d.disputeId.toString().includes(term)
      )
    }

    return result
  }, [disputes, searchTerm])

  // Preview selected dispute (moved sau khi filtered được tính)
  const previewDispute = filtered.find((d) => d.disputeId === previewDisputeId)

  // Khi load trang hoặc khi danh sách filtered thay đổi, tự chọn dispute đầu tiên để preview
  useEffect(() => {
    if (!previewDisputeId && filtered.length > 0) {
      setPreviewDisputeId(filtered[0].disputeId)
    }
  }, [filtered, previewDisputeId])

  const summary = useMemo(() => {
    return {
      total: disputes.length,
      open: disputes.filter((d) => d.status === 'OPEN').length,
      review: disputes.filter((d) => d.status === 'IN_REVIEW').length,
      resolved: disputes.filter((d) => d.status === 'RESOLVED').length,
      rejected: disputes.filter((d) => d.status === 'REJECTED').length
    }
  }, [disputes])

  // Bulk resolve mutation
  const bulkResolveMutation = useMutation({
    mutationFn: async ({ disputeIds, resolutionNote }: { disputeIds: number[]; resolutionNote?: string }) => {
      const promises = disputeIds.map((id) =>
        disputeApi.resolveDispute(id, {
          status: 'RESOLVED',
          resolutionNote: resolutionNote || 'Bulk resolved by staff'
        })
      )
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(`Successfully resolved ${selectedDisputeIds.size} dispute(s)`)
      setSelectedDisputeIds(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
    },
    onError: () => {
      message.error('Failed to resolve some disputes. Please try again.')
    }
  })

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ disputeIds, resolutionNote }: { disputeIds: number[]; resolutionNote?: string }) => {
      const promises = disputeIds.map((id) =>
        disputeApi.resolveDispute(id, {
          status: 'REJECTED',
          resolutionNote: resolutionNote || 'Bulk rejected by staff'
        })
      )
      return Promise.all(promises)
    },
    onSuccess: () => {
      message.success(`Successfully rejected ${selectedDisputeIds.size} dispute(s)`)
      setSelectedDisputeIds(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
    },
    onError: () => {
      message.error('Failed to reject some disputes. Please try again.')
    }
  })

  const handleSelectDispute = (disputeId: number, checked: boolean) => {
    const newSelected = new Set(selectedDisputeIds)
    if (checked) {
      newSelected.add(disputeId)
    } else {
      newSelected.delete(disputeId)
    }
    setSelectedDisputeIds(newSelected)
    // Only show bulk actions if there are visible selected disputes
    const visibleSelectedCount = filtered.filter((d) => newSelected.has(d.disputeId)).length
    setShowBulkActions(visibleSelectedCount > 0)
  }

  const handleSelectAll = (checked: boolean, status: string) => {
    const disputesInColumn = filtered.filter((d) => d.status === status)
    const newSelected = new Set(selectedDisputeIds)

    if (checked) {
      // Chọn tất cả disputes trong column này
      disputesInColumn.forEach((d) => newSelected.add(d.disputeId))
    } else {
      // Bỏ chọn tất cả disputes trong column này
      disputesInColumn.forEach((d) => newSelected.delete(d.disputeId))
    }

    setSelectedDisputeIds(newSelected)
    // Chỉ hiển thị bulk actions nếu có ít nhất 1 dispute được chọn
    const visibleSelectedCount = filtered.filter((d) => newSelected.has(d.disputeId)).length
    setShowBulkActions(visibleSelectedCount > 0)
  }

  const handleBulkResolve = () => {
    // Only get disputes that are currently visible
    const visibleSelectedIds = filtered.filter((d) => selectedDisputeIds.has(d.disputeId)).map((d) => d.disputeId)
    
    if (visibleSelectedIds.length === 0) {
      message.warning('No visible disputes selected')
      return
    }

    Modal.confirm({
      title: 'Resolve Selected Disputes',
      content: `Are you sure you want to resolve ${visibleSelectedIds.length} dispute(s)?`,
      okText: 'Resolve',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: () => {
        bulkResolveMutation.mutate({
          disputeIds: visibleSelectedIds
        })
      }
    })
  }

  const handleBulkReject = () => {
    // Only get disputes that are currently visible
    const visibleSelectedIds = filtered.filter((d) => selectedDisputeIds.has(d.disputeId)).map((d) => d.disputeId)
    
    if (visibleSelectedIds.length === 0) {
      message.warning('No visible disputes selected')
      return
    }

    Modal.confirm({
      title: 'Reject Selected Disputes',
      content: `Are you sure you want to reject ${visibleSelectedIds.length} dispute(s)?`,
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        bulkRejectMutation.mutate({
          disputeIds: visibleSelectedIds
        })
      }
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDateRange([null, null])
    setGroupIdFilter(undefined)
    setDisputeTypeFilter('ALL')
    setStatusFilter('OPEN')
  }

  const hasActiveFilters = searchTerm || dateRange[0] || dateRange[1] || groupIdFilter || disputeTypeFilter !== 'ALL'

  if (isLoading) return <Skeleton />

  return (
    <AdminPageContainer>
      <header className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-rose-300'>Staff escalation</p>
          <h1 className='text-3xl font-bold text-slate-900'>Dispute center</h1>
          <p className='text-slate-500 text-sm'>Monitor and resolve incident reports across groups.</p>
        </div>
        <div className='flex gap-2'>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            style={{ width: 200 }}
            options={[
              { label: 'All statuses', value: 'ALL' },
              { label: 'Open', value: 'OPEN' },
              { label: 'In review', value: 'IN_REVIEW' },
              { label: 'Resolved', value: 'RESOLVED' },
              { label: 'Rejected', value: 'REJECTED' }
            ]}
          />
        </div>
      </header>

      {/* Search and Filters */}
      <div className='space-y-3'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <Input
            placeholder='Search by title, group, reporter, or ID...'
            prefix={<SearchOutlined className='text-gray-400' />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className='flex-1'
            size='large'
          />
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={showAdvancedFilters ? 'bg-blue-500 text-white' : ''}
            size='large'
          >
            Advanced Filters
          </Button>
          {hasActiveFilters && (
            <Button icon={<ClearOutlined />} onClick={clearFilters} size='large'>
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <Collapse activeKey={showAdvancedFilters ? ['filters'] : []} onChange={(keys) => setShowAdvancedFilters(keys.includes('filters'))}>
          <Panel key='filters' header='Advanced Filters'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Created Date Range</label>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                  className='w-full'
                  format='DD/MM/YYYY'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Group</label>
                <Select
                  value={groupIdFilter}
                  onChange={setGroupIdFilter}
                  placeholder='All groups'
                  allowClear
                  className='w-full'
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {groups.map((group) => (
                    <Option key={group.groupId} value={group.groupId}>
                      {group.groupName} (ID: {group.groupId})
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Dispute Type</label>
                <Select
                  value={disputeTypeFilter}
                  onChange={setDisputeTypeFilter}
                  className='w-full'
                >
                  <Option value='ALL'>All Types</Option>
                  <Option value='PAYMENT'>Payment</Option>
                  <Option value='USAGE'>Usage</Option>
                  <Option value='MAINTENANCE'>Maintenance</Option>
                  <Option value='BEHAVIOR'>Behavior</Option>
                  <Option value='OTHER'>Other</Option>
                </Select>
              </div>
            </div>
          </Panel>
        </Collapse>

        {/* Results count */}
        {(hasActiveFilters || filtered.length !== disputes.length) && (
          <div className='text-sm text-gray-600'>
            Showing {filtered.length} of {disputes.length} disputes
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && selectedDisputeIds.size > 0 && (() => {
        // Count only disputes that are currently visible in the filtered list
        const visibleSelectedCount = filtered.filter((d) => selectedDisputeIds.has(d.disputeId)).length
        return visibleSelectedCount > 0 ? (
        <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <span className='font-semibold text-blue-900'>{visibleSelectedCount} dispute(s) selected</span>
          </div>
          <Space>
            <Button
              icon={<CheckOutlined />}
              type='primary'
              onClick={handleBulkResolve}
              loading={bulkResolveMutation.isPending}
              className='bg-green-600 hover:bg-green-700'
            >
              Resolve Selected
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
              setSelectedDisputeIds(new Set())
              setShowBulkActions(false)
            }}>Clear Selection</Button>
          </Space>
        </div>
        ) : null
      })()}

      <section className='grid gap-3 md:grid-cols-4'>
        <SummaryCard label='Open' value={summary.open} accent='bg-orange-50 text-orange-700 border-orange-100' />
        <SummaryCard label='In review' value={summary.review} accent='bg-blue-50 text-blue-700 border-blue-100' />
        <SummaryCard
          label='Resolved'
          value={summary.resolved}
          accent='bg-emerald-50 text-emerald-700 border-emerald-100'
        />
        <SummaryCard
          label='Total disputes'
          value={summary.total}
          accent='bg-slate-50 text-slate-700 border-slate-100'
        />
      </section>

      {/* Main content: list + preview, giống bố cục trang Group */}
      <div className='grid gap-6 lg:grid-cols-[1.65fr,1fr]'>
        {/* Left Panel - Dispute Columns */}
        <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'>
          {statusColumns
            .filter((column) => statusFilter === 'ALL' || column.key === statusFilter)
            .map((column) => {
              const items = filtered.filter((d) => d.status === column.key)
              const allSelected = items.length > 0 && items.every((d) => selectedDisputeIds.has(d.disputeId))
              const someSelected = items.some((d) => selectedDisputeIds.has(d.disputeId))

              return (
                <div key={column.key} className={`rounded-2xl border ${column.accent} p-3`}>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          const shouldSelect = !allSelected
                          handleSelectAll(shouldSelect, column.key)
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      />
                      <p className='text-sm font-semibold text-gray-800'>{column.label}</p>
                    </div>
                    <Tag color={statusColors[column.key] || 'default'}>{items.length}</Tag>
                  </div>
                  <div className='space-y-3 max-h-[600px] overflow-y-auto'>
                    {items.length === 0 ? (
                      <p className='py-6 text-center text-xs text-gray-400'>No disputes here</p>
                    ) : (
                      items.map((dispute) => {
                        const isSelected = selectedDisputeIds.has(dispute.disputeId)
                        const isPreview = previewDisputeId === dispute.disputeId
                        return (
                          <div
                            key={dispute.disputeId}
                            className={`w-full rounded-2xl border ${
                              isPreview
                                ? 'border-blue-600 bg-blue-100 shadow-lg'
                                : isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-white bg-white/90'
                            } p-3 shadow hover:shadow-md transition-all cursor-pointer`}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                                return
                              }
                              setPreviewDisputeId(dispute.disputeId)
                            }}
                          >
                            <div className='flex items-start gap-2'>
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleSelectDispute(dispute.disputeId, e.target.checked)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className='flex-1 text-left'>
                                <p className='text-sm font-semibold text-slate-900 line-clamp-1'>{dispute.title}</p>
                                <p className='text-xs text-slate-500'>{dispute.groupName}</p>
                                <p className='mt-2 text-[11px] text-slate-400'>
                                  {new Date(dispute.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
        </div>

        {/* Right Panel - Preview */}
        <div className='lg:col-span-1'>
          {previewDispute ? (
            <div className='sticky top-6 bg-white rounded-2xl border border-gray-200 shadow-lg p-5 space-y-4 max-w-md ml-auto'>
              <div className='flex items-start justify-between'>
                <div>
                  <h3 className='text-lg font-bold text-gray-900'>{previewDispute.title}</h3>
                  <p className='text-sm text-gray-600 mt-1'>{previewDispute.groupName}</p>
                </div>
                <Tag color={statusColors[previewDispute.status] || 'default'} className='font-medium px-3 py-1 rounded-full'>
                  {previewDispute.status}
                </Tag>
              </div>

              <div className='space-y-3 pt-4 border-t border-gray-200'>
                <div>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Type</p>
                  <p className='text-sm text-gray-900 mt-1'>{previewDispute.type}</p>
                </div>
                <div>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Reporter</p>
                  <p className='text-sm text-gray-900 mt-1'>{previewDispute.reporterName || '—'}</p>
                </div>
                <div>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Created</p>
                  <p className='text-sm text-gray-900 mt-1'>
                    {new Date(previewDispute.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {previewDispute.shortDescription && (
                  <div>
                    <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Summary</p>
                    <p className='text-sm text-gray-700 mt-1 line-clamp-3'>
                      {previewDispute.shortDescription}
                    </p>
                  </div>
                )}
                {previewDispute.assignedStaffName && (
                  <div>
                    <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Assigned to</p>
                    <p className='text-sm text-gray-900 mt-1'>{previewDispute.assignedStaffName}</p>
                  </div>
                )}
              </div>

              <div className='pt-4 border-t border-gray-200 space-y-2'>
                <Button
                  type='primary'
                  block
                  onClick={() => navigate(`/manager/${path.disputeDetail.replace(':disputeId', previewDispute.disputeId.toString())}`)}
                  className='bg-blue-600 hover:bg-blue-700'
                >
                  View Full Details
                </Button>
                <Button
                  block
                  onClick={() => setPreviewDisputeId(null)}
                  className='border-gray-300'
                >
                  Close Preview
                </Button>
              </div>
            </div>
          ) : (
            <div className='sticky top-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center'>
              <p className='text-sm text-gray-400'>Select a dispute to preview details</p>
            </div>
          )}
        </div>
      </div>
    </AdminPageContainer>
  )
}

const SummaryCard = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${accent}`}>
    <p className='text-[11px] uppercase tracking-wide text-gray-400'>{label}</p>
    <p className='mt-1 text-2xl'>{value}</p>
  </div>
)

export default DisputeList
