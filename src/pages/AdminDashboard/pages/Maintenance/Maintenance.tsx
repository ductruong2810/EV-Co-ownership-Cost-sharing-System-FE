import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import technicianApi from '../../../../apis/technician.api'
import auditApi from '../../../../apis/audit.api'
import Skeleton from '../../../../components/Skeleton'
import { toast } from 'react-toastify'
import logger from '../../../../utils/logger'
import { Input, Select, Tag, DatePicker, InputNumber, Button, Space, Checkbox, Modal, message } from 'antd'
import { SearchOutlined, FilterOutlined, ClearOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'

// TYPES
export interface MaintenanceReport {
  userId: number
  userName: string
  vehicleId: number
  vehicleModel: string
  licensePlate: string
}

export interface MaintenanceRequest {
  id: number
  vehicleId: number
  vehicleModel: string
  requestedByName: string
  approvedByName: string | null
  liableUserName: string
  coverageType: 'PERSONAL' | 'COMMERCIAL' | string
  description: string
  actualCost: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'FUNDED' | string
  requestDate: string
  approvalDate: string | null
  nextDueDate: string | null
  estimatedDurationDays: number
  maintenanceStartAt: string | null
  expectedFinishAt: string | null
  maintenanceCompletedAt: string | null
  createdAt: string
  updatedAt: string
  payerShares: number | null
}

type CreateForm = {
  vehicleId: number | null
  userId: number | null
  description: string
  cost: string
  estimatedDurationDays: string
}

type CreateFormErrors = {
  description?: string
  cost?: string
  estimatedDurationDays?: string
}

// TYPE for mutation input
type CreateMaintenanceInput = {
  userId: number
  vehicleId: number
  description: string
  cost: number
  estimatedDurationDays: number
}

const validateForm = (values: CreateForm): CreateFormErrors => {
  const errors: CreateFormErrors = {}
  const description = values.description.trim()
  const costNumber = Number(values.cost)
  const durationNumber = Number(values.estimatedDurationDays)

  if (!description) {
    errors.description = 'Description is required.'
  } else if (description.length < 5) {
    errors.description = 'Description must be at least 5 characters.'
  }

  if (!values.cost) {
    errors.cost = 'Estimated cost is required.'
  } else if (!Number.isFinite(costNumber) || costNumber <= 0) {
    errors.cost = 'Cost must be a positive number.'
  }

  if (!values.estimatedDurationDays) {
    errors.estimatedDurationDays = 'Expected duration is required.'
  } else if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
    errors.estimatedDurationDays = 'Duration must be a positive number.'
  } else if (!Number.isInteger(durationNumber)) {
    errors.estimatedDurationDays = 'Duration must be an integer (days).'
  }

  return errors
}

// Custom Modal using Tailwind transition
function CreateModal({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!show) return null

  return (
    <div className='fixed inset-0 z-30 bg-black/40 flex justify-center items-center transition-opacity duration-300'>
      <div className='bg-white p-6 rounded-2xl shadow-2xl border-2 border-teal-500/20 max-w-md w-full relative transition-transform duration-300 scale-100 opacity-100'>
        <button
          className='absolute top-2 right-2 text-teal-700 text-xl rounded-full hover:bg-teal-50 p-1'
          onClick={onClose}
          aria-label='Close'
          type='button'
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

const statusOrder: { key: string; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'FUNDED', label: 'Funded' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'REJECTED', label: 'Rejected' }
]

const formatStatusLabel = (status: string) => {
  const found = statusOrder.find((item) => item.key === status)
  return found ? found.label : status
}

const statusAccent = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    case 'FUNDED':
      return 'bg-blue-50 text-blue-600 border border-blue-100'
    case 'APPROVED':
      return 'bg-indigo-50 text-indigo-600 border border-indigo-100'
    case 'REJECTED':
      return 'bg-rose-50 text-rose-600 border border-rose-100'
    default:
      return 'bg-amber-50 text-amber-600 border border-amber-100'
  }
}

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

function MaintenanceList() {
  const queryClient = useQueryClient()

  // Query user/vehicle list
  const {
    data: userVehicleList = [],
    isLoading: loadingUser,
    isError: errorUser,
    error: errorUserMsg
  } = useQuery<MaintenanceReport[], Error>({
    queryKey: ['technician', 'rejectedUsers'],
    queryFn: () => technicianApi.getAllUserReport().then((res) => res.data)
  })

  logger.debug('User vehicle list:', userVehicleList)

  // Query created maintenances
  const {
    data: maintenances = [],
    isLoading: loadingMaint,
    isError: errorMaint,
    error: errorMaintMsg
  } = useQuery<MaintenanceRequest[], Error>({
    queryKey: ['technician', 'myMaintenances'],
    queryFn: () => technicianApi.getAllMaintance().then((res) => res.data)
  })

  // State for modal and form
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    userId: null,
    vehicleId: null,
    description: '',
    cost: '',
    estimatedDurationDays: ''
  })
  const [formErrors, setFormErrors] = useState<CreateFormErrors>({})
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)

  // Mutation to create maintenance request
  const createMutation = useMutation<unknown, unknown, CreateMaintenanceInput>({
    mutationFn: (data) => technicianApi.createMantainance(data, data.vehicleId),
    onSuccess: () => {
      toast.success('Maintenance request created successfully!')
      setShowModal(false)
      setFormErrors({})
      setCreateErrorMessage(null)
      setForm({
        userId: null,
        vehicleId: null,
        description: '',
        cost: '',
        estimatedDurationDays: ''
      })
      queryClient.invalidateQueries({ queryKey: ['technician', 'rejectedUsers'] })
      queryClient.invalidateQueries({ queryKey: ['technician', 'myMaintenances'] })
      auditApi
        .logAction({
          type: 'MAINTENANCE_REQUEST',
          entityId: data.vehicleId,
          entityType: 'MAINTENANCE',
          message: `Created maintenance request for vehicle #${data.vehicleId}`,
          metadata: { cost: data.cost, duration: data.estimatedDurationDays }
        })
        .catch(() => undefined)
    },
    onError: () => {
      setCreateErrorMessage('Failed to create maintenance request. Please try again.')
    }
  })

  // Mutation to mark as complete (only when status = FUNDED)
  const completeMutation = useMutation<unknown, unknown, { id: number }>({
    mutationFn: (data) => technicianApi.completeMantainance(String(data.id)),
    onSuccess: () => {
      toast.success('Marked as completed!')
      queryClient.invalidateQueries({ queryKey: ['technician', 'myMaintenances'] })
      auditApi
        .logAction({
          type: 'MAINTENANCE_COMPLETE',
          entityId: data.id,
          entityType: 'MAINTENANCE',
          message: `Completed maintenance request #${data.id}`
        })
        .catch(() => undefined)
    },
    onError: () => {
      toast.error('Unable to update status. Please try again later.')
    }
  })

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')
  
  // Advanced filters
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [minCost, setMinCost] = useState<number | null>(null)
  const [maxCost, setMaxCost] = useState<number | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Bulk actions
  const [selectedMaintenances, setSelectedMaintenances] = useState<Set<number>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Bulk complete mutation
  const bulkCompleteMutation = useMutation({
    mutationFn: async (maintenanceIds: number[]) => {
      const promises = maintenanceIds.map((id) => technicianApi.completeMantainance(String(id)))
      return Promise.all(promises)
    },
    onSuccess: () => {
      toast.success(`Successfully completed ${selectedMaintenances.size} maintenance request(s)`)
      setSelectedMaintenances(new Set())
      setShowBulkActions(false)
      queryClient.invalidateQueries({ queryKey: ['technician', 'myMaintenances'] })
      // Log audit for each
      Array.from(selectedMaintenances).forEach((id) => {
        auditApi
          .logAction({
            type: 'MAINTENANCE_COMPLETE',
            entityId: id,
            entityType: 'MAINTENANCE',
            message: `Completed maintenance request #${id}`
          })
          .catch(() => undefined)
      })
    },
    onError: () => {
      toast.error('Failed to complete some maintenance requests. Please try again.')
    }
  })

  const handleSelectMaintenance = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedMaintenances)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedMaintenances(newSelected)
    // Only show bulk actions if selected items are FUNDED status
    const fundedIds = filteredMaintenances
      .filter((m) => m.status === 'FUNDED' && newSelected.has(m.id))
      .map((m) => m.id)
    setShowBulkActions(fundedIds.length > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const fundedIds = new Set(
        filteredMaintenances.filter((m) => m.status === 'FUNDED').map((m) => m.id)
      )
      setSelectedMaintenances(fundedIds)
      setShowBulkActions(fundedIds.size > 0)
    } else {
      setSelectedMaintenances(new Set())
      setShowBulkActions(false)
    }
  }

  const handleBulkComplete = () => {
    const fundedIds = filteredMaintenances
      .filter((m) => m.status === 'FUNDED' && selectedMaintenances.has(m.id))
      .map((m) => m.id)
    if (fundedIds.length === 0) {
      message.warning('No funded maintenance requests selected')
      return
    }
    Modal.confirm({
      title: 'Complete Selected Maintenance Requests',
      content: `Are you sure you want to mark ${fundedIds.length} maintenance request(s) as completed?`,
      onOk: () => {
        bulkCompleteMutation.mutate(fundedIds)
      }
    })
  }

  const handleOpenCreate = (report: MaintenanceReport) => {
    setForm({
      userId: report.userId,
      vehicleId: report.vehicleId,
      description: '',
      cost: '',
      estimatedDurationDays: ''
    })
    setFormErrors({})
    setCreateErrorMessage(null)
    setShowModal(true)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
    setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    setCreateErrorMessage(null)
  }

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (createMutation.isPending) return

    if (!form.userId || !form.vehicleId) {
      setCreateErrorMessage('Missing vehicle or user information!')
      return
    }

    const errors = validateForm(form)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    createMutation.mutate({
      userId: form.userId,
      vehicleId: form.vehicleId,
      description: form.description.trim(),
      cost: Number(form.cost),
      estimatedDurationDays: Number(form.estimatedDurationDays)
    })
  }

  if (loadingUser || loadingMaint) return <Skeleton />
  if (errorUser) return <div className='text-rose-600 p-6'>{errorUserMsg?.message}</div>
  if (errorMaint) return <div className='text-rose-600 p-6'>{errorMaintMsg?.message}</div>

  const selectedVehicle =
    form.vehicleId && form.userId
      ? userVehicleList.find((u) => u.vehicleId === form.vehicleId && u.userId === form.userId)
      : null

  const filteredMaintenances = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return maintenances.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
      const matchesSearch =
        !term ||
        item.vehicleModel.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.licensePlate?.toLowerCase?.().includes(term)
      
      // Filter by date range (requestDate)
      const matchesDateRange =
        !dateRange[0] ||
        !dateRange[1] ||
        (item.requestDate &&
          dayjs(item.requestDate).isAfter(dateRange[0]!.subtract(1, 'day')) &&
          dayjs(item.requestDate).isBefore(dateRange[1]!.add(1, 'day')))
      
      // Filter by cost range
      const matchesCostRange =
        (minCost === null || (item.actualCost && item.actualCost >= minCost)) &&
        (maxCost === null || (item.actualCost && item.actualCost <= maxCost))
      
      return matchesStatus && matchesSearch && matchesDateRange && matchesCostRange
    })
  }, [maintenances, statusFilter, searchTerm, dateRange, minCost, maxCost])

  const hasActiveAdvancedFilters = dateRange[0] || dateRange[1] || minCost !== null || maxCost !== null

  const clearAdvancedFilters = () => {
    setDateRange([null, null])
    setMinCost(null)
    setMaxCost(null)
  }

  const summaryMetrics = useMemo(() => {
    const total = maintenances.length
    const open = maintenances.filter((m) => ['PENDING', 'APPROVED', 'FUNDED'].includes(m.status)).length
    const completed = maintenances.filter((m) => m.status === 'COMPLETED').length
    const overdue = maintenances.filter((m) => {
      if (!m.expectedFinishAt || m.status === 'COMPLETED') return false
      const finish = new Date(m.expectedFinishAt).getTime()
      return finish < Date.now()
    }).length
    return [
      { label: 'Open tasks', value: open, accent: 'bg-blue-50 text-blue-600 border-blue-100' },
      { label: 'Completed', value: completed, accent: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      { label: 'Overdue', value: overdue, accent: 'bg-rose-50 text-rose-600 border-rose-100' },
      { label: 'Total requests', value: total, accent: 'bg-slate-50 text-slate-600 border-slate-100' }
    ]
  }, [maintenances])

  const boardColumns = useMemo(() => {
    return statusOrder.map((column) => ({
      ...column,
      items: filteredMaintenances.filter((item) => item.status === column.key)
    }))
  }, [filteredMaintenances])

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-4 sm:p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8 space-y-2'>
          <p className='text-xs font-semibold uppercase tracking-widest text-indigo-400'>Technician panel</p>
          <h1 className='text-3xl font-bold text-gray-900'>Maintenance management</h1>
          <p className='text-gray-600'>Track open requests, create new maintenance tasks, and close funded jobs.</p>
        </div>

        <div className='mb-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className={`rounded-2xl border px-4 py-3 ${metric.accent}`}>
              <p className='text-xs uppercase tracking-wide text-gray-400'>{metric.label}</p>
              <p className='mt-1 text-2xl font-semibold'>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className='space-y-8'>
          {/* List of vehicles/users needing maintenance */}
          <div>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>List of Vehicles/Users Needing Maintenance</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
              {userVehicleList.length === 0 && (
                <div className='text-slate-500 col-span-full'>No vehicles require maintenance.</div>
              )}
              {userVehicleList.map((vehicle, index) => (
                <div
                  key={`${vehicle.userId}-${vehicle.vehicleId}-${index}`}
                  className='flex flex-col bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all p-6 group'
                >
                  <div>
                    <span className='block font-bold text-slate-900 text-base'>{vehicle.vehicleModel}</span>
                    <span className='block text-teal-600 text-sm mb-1'>{vehicle.licensePlate}</span>
                    <span className='text-slate-700 text-sm'>
                      Owner: <span className='font-medium'>{vehicle.userName}</span>
                    </span>
                  </div>
                  <button
                    type='button'
                    className='w-full mt-4 rounded-xl bg-teal-600 text-white font-semibold py-2 shadow hover:bg-teal-700 transition disabled:opacity-60'
                    onClick={() => handleOpenCreate(vehicle)}
                    disabled={createMutation.isPending}
                  >
                    Create Maintenance Request
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* List of existing maintenance requests */}
          <div>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <h2 className='text-xl font-bold text-gray-800'>Submitted Maintenance Requests</h2>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Input
                  placeholder='Search vehicle, owner, description...'
                  prefix={<SearchOutlined className='text-gray-400' />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  className='w-full sm:w-64'
                  size='large'
                />
                <Select
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  className='w-full sm:w-48'
                  size='large'
                >
                  <Select.Option value='ALL'>All statuses</Select.Option>
                  {statusOrder.map((status) => (
                    <Select.Option key={status.key} value={status.key}>
                      {status.label}
                    </Select.Option>
                  ))}
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
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className='mb-4 rounded-2xl bg-white border border-gray-200 p-4'>
                <Space direction='vertical' size='middle' className='w-full'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Request Date Range</label>
                      <DatePicker.RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                        format='DD/MM/YYYY'
                        className='w-full'
                        placeholder={['From date', 'To date']}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Min Cost (VND)</label>
                      <InputNumber
                        value={minCost}
                        onChange={(value) => setMinCost(value)}
                        min={0}
                        placeholder='Minimum'
                        className='w-full'
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Max Cost (VND)</label>
                      <InputNumber
                        value={maxCost}
                        onChange={(value) => setMaxCost(value)}
                        min={0}
                        placeholder='Maximum'
                        className='w-full'
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
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

            {/* Bulk Actions Bar */}
            {showBulkActions && selectedMaintenances.size > 0 && (
              <div className='mb-4 rounded-2xl bg-blue-50 border border-blue-200 p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm font-semibold text-blue-900'>
                      {selectedMaintenances.size} maintenance request(s) selected
                      {filteredMaintenances.filter((m) => m.status === 'FUNDED' && selectedMaintenances.has(m.id))
                        .length > 0 && (
                        <span className='ml-2 text-xs text-blue-700'>
                          ({filteredMaintenances.filter((m) => m.status === 'FUNDED' && selectedMaintenances.has(m.id)).length} can be completed)
                        </span>
                      )}
                    </span>
                  </div>
                  <Space>
                    <Button
                      icon={<CheckCircleOutlined />}
                      type='primary'
                      onClick={handleBulkComplete}
                      loading={bulkCompleteMutation.isPending}
                      className='bg-emerald-600 hover:bg-emerald-700'
                      disabled={
                        filteredMaintenances.filter((m) => m.status === 'FUNDED' && selectedMaintenances.has(m.id))
                          .length === 0
                      }
                    >
                      Complete Selected
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedMaintenances(new Set())
                        setShowBulkActions(false)
                      }}
                    >
                      Clear Selection
                    </Button>
                  </Space>
                </div>
              </div>
            )}

            {filteredMaintenances.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-gray-200 bg-white/70 px-6 py-12 text-center text-gray-500'>
                No maintenance requests match your filters.
              </div>
            ) : (
              <div className='overflow-x-auto pb-4'>
                <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-w-[1200px]'>
                  {boardColumns.map((column) => (
                  <div key={column.key} className='rounded-2xl border border-gray-100 bg-white shadow-sm'>
                    <div className='flex items-center justify-between border-b px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <Checkbox
                          checked={
                            column.items.length > 0 &&
                            column.items.every((item) => selectedMaintenances.has(item.id))
                          }
                          indeterminate={
                            column.items.some((item) => selectedMaintenances.has(item.id)) &&
                            !column.items.every((item) => selectedMaintenances.has(item.id))
                          }
                          onChange={(e) => {
                            const newSelected = new Set(selectedMaintenances)
                            if (e.target.checked) {
                              column.items.forEach((item) => newSelected.add(item.id))
                            } else {
                              column.items.forEach((item) => newSelected.delete(item.id))
                            }
                            setSelectedMaintenances(newSelected)
                            const fundedIds = filteredMaintenances
                              .filter((m) => m.status === 'FUNDED' && newSelected.has(m.id))
                              .map((m) => m.id)
                            setShowBulkActions(fundedIds.length > 0)
                          }}
                        />
                        <p className='text-sm font-semibold text-gray-700'>{column.label}</p>
                      </div>
                      <Tag color='blue'>{column.items.length}</Tag>
                    </div>
                    <div className='space-y-3 px-3 py-3'>
                      {column.items.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-400'>
                          Empty
                        </div>
                      ) : (
                        column.items.map((item) => {
                          const isSelected = selectedMaintenances.has(item.id)
                          const hasActualCost = typeof item.actualCost === 'number'
                          const expectedFinish =
                            item.expectedFinishAt &&
                            new Date(item.expectedFinishAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })
                          const actualFinish =
                            item.maintenanceCompletedAt &&
                            new Date(item.maintenanceCompletedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })
                          return (
                            <div
                              key={item.id}
                              className={`rounded-2xl border p-3 text-sm shadow hover:shadow-md ${
                                isSelected ? 'border-blue-400 bg-blue-50/40' : 'border-gray-100 bg-white'
                              }`}
                            >
                              <div className='flex items-start gap-2 mb-2'>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => handleSelectMaintenance(item.id, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className='flex-1'>
                              <div className='flex items-center justify-between gap-2'>
                                <div>
                                  <p className='font-semibold text-gray-900'>{item.vehicleModel}</p>
                                  <p className='text-xs text-gray-500'>{item.licensePlate || 'N/A'}</p>
                                </div>
                                <span
                                  className={`text-[11px] font-semibold uppercase tracking-wide ${statusAccent(item.status)}`}
                                >
                                  {formatStatusLabel(item.status)}
                                </span>
                              </div>
                              <p className='mt-2 text-gray-600 line-clamp-2'>{item.description}</p>
                              <div className='mt-3 space-y-2 rounded-xl border border-gray-100 bg-slate-50 p-3 text-xs text-gray-600'>
                                <div className='flex justify-between'>
                                  <span>Estimated cost</span>
                                  <strong>{formatCurrency(item.cost)}</strong>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Actual cost</span>
                                  <strong className={hasActualCost ? 'text-emerald-600' : 'text-gray-400'}>
                                    {hasActualCost ? formatCurrency(item.actualCost) : 'Pending'}
                                  </strong>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Duration</span>
                                  <span>
                                    {item.estimatedDurationDays || '?'} days
                                    {actualFinish && ` • finished ${actualFinish}`}
                                  </span>
                                </div>
                                <div className='flex justify-between text-[11px] text-gray-500'>
                                  <span>Expected finish</span>
                                  <span>{expectedFinish || '—'}</span>
                                </div>
                              </div>
                              {item.status === 'FUNDED' && (
                                <button
                                  type='button'
                                  className='mt-3 w-full rounded-lg bg-emerald-600 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
                                  disabled={completeMutation.isPending}
                                  onClick={() => completeMutation.mutate({ id: item.id })}
                                >
                                  {completeMutation.isPending ? 'Saving...' : 'Mark as completed'}
                                </button>
                              )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal for creating new requests */}
          <CreateModal show={showModal} onClose={() => setShowModal(false)}>
            <h3 className='text-lg font-bold text-teal-700 mb-2'>Create Maintenance Request</h3>
            {selectedVehicle && (
              <div className='mb-3 text-slate-600 text-sm'>
                Vehicle: <span className='font-semibold text-black'>{selectedVehicle.vehicleModel}</span>
                <span className='ml-2 text-teal-700'>{selectedVehicle.licensePlate}</span>
                <br />
                Owner: <span className='font-semibold text-black'>{selectedVehicle.userName}</span>
              </div>
            )}
            {createErrorMessage && (
              <div className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 mb-2 text-xs md:text-sm text-rose-700'>
                {createErrorMessage}
              </div>
            )}
            <form onSubmit={handleCreate} className='space-y-3' autoComplete='off'>
              <div>
                <label className='block text-xs font-medium text-teal-700 mb-1.5'>Maintenance Description</label>
                <textarea
                  name='description'
                  rows={2}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    formErrors.description
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600'
                  }`}
                  placeholder='e.g., Oil change, brake inspection...'
                  value={form.description}
                  onChange={handleChange}
                />
                {formErrors.description && (
                  <div className='mt-1 text-[12px] text-rose-600'>{formErrors.description}</div>
                )}
              </div>
              <div>
                <label className='block text-xs font-medium text-teal-700 mb-1.5'>Estimated Cost</label>
                <input
                  type='number'
                  name='cost'
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    formErrors.cost
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600'
                  }`}
                  placeholder='e.g., 500000'
                  value={form.cost}
                  onChange={handleChange}
                />
                {formErrors.cost && <div className='mt-1 text-[12px] text-rose-600'>{formErrors.cost}</div>}
              </div>
              <div>
                <label className='block text-xs font-medium text-teal-700 mb-1.5'>Expected Duration (days)</label>
                <input
                  type='number'
                  name='estimatedDurationDays'
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    formErrors.estimatedDurationDays
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600'
                  }`}
                  placeholder='e.g., 3'
                  value={form.estimatedDurationDays}
                  onChange={handleChange}
                />
                {formErrors.estimatedDurationDays && (
                  <div className='mt-1 text-[12px] text-rose-600'>{formErrors.estimatedDurationDays}</div>
                )}
              </div>
              <div className='flex justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs md:text-sm font-medium text-teal-700 hover:bg-teal-50'
                  disabled={createMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={createMutation.isPending || !form.userId || !form.vehicleId}
                  className='rounded-xl bg-teal-600 px-5 py-2 text-xs md:text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed'
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </CreateModal>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceList
