import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import technicianApi from '../../../../apis/technician.api'
import auditApi from '../../../../apis/audit.api'
import { toast } from 'react-toastify'
import logger from '../../../../utils/logger'
import { Input, Select, Tag, DatePicker, InputNumber, Button, Space, Checkbox, Modal, message, Spin, Alert } from 'antd'
import { SearchOutlined, FilterOutlined, ClearOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useI18n } from '../../../../i18n/useI18n'
import { showErrorToast } from '../../../../components/Error/ErrorToast'
import { ErrorType, ErrorSeverity } from '../../../../types/error.type'

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
  licensePlate?: string
  requestedByName: string
  approvedByName: string | null
  liableUserName: string
  coverageType: 'PERSONAL' | 'COMMERCIAL' | string
  description: string
  actualCost: number
  cost?: number
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

const validateForm = (values: CreateForm, t: (key: string) => string): CreateFormErrors => {
  const errors: CreateFormErrors = {}
  const description = values.description.trim()
  const costNumber = Number(values.cost)
  const durationNumber = Number(values.estimatedDurationDays)

  if (!description) {
    errors.description = t('admin_maintenance_validation_description_required')
  } else if (description.length < 5) {
    errors.description = t('admin_maintenance_validation_description_min')
  }

  if (!values.cost) {
    errors.cost = t('admin_maintenance_validation_cost_required')
  } else if (!Number.isFinite(costNumber) || costNumber <= 0) {
    errors.cost = t('admin_maintenance_validation_cost_positive')
  }

  if (!values.estimatedDurationDays) {
    errors.estimatedDurationDays = t('admin_maintenance_validation_duration_required')
  } else if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
    errors.estimatedDurationDays = t('admin_maintenance_validation_duration_positive')
  } else if (!Number.isInteger(durationNumber)) {
    errors.estimatedDurationDays = t('admin_maintenance_validation_duration_integer')
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

const getStatusOrder = (t: (key: string) => string): { key: string; label: string }[] => [
  { key: 'PENDING', label: t('admin_maintenance_status_pending') },
  { key: 'APPROVED', label: t('admin_maintenance_status_approved') },
  { key: 'FUNDED', label: t('admin_maintenance_status_funded') },
  { key: 'COMPLETED', label: t('admin_maintenance_status_completed') },
  { key: 'REJECTED', label: t('admin_maintenance_status_rejected') }
]

const formatStatusLabel = (status: string, t: (key: string) => string) => {
  const statusOrder = getStatusOrder(t)
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
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // Query user/vehicle list
  const {
    data: userVehicleList = [],
    isLoading: loadingUser,
    isError: errorUser,
    error: errorUserMsg
  } = useQuery<MaintenanceReport[], Error>({
    queryKey: ['technician', 'rejectedUsers'],
    queryFn: () => technicianApi.getAllUserReport().then((res) => res.data),
    retry: 1
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
    queryFn: () => technicianApi.getAllMaintance().then((res) => res.data),
    retry: 1
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
    onSuccess: (_, variables) => {
      toast.success(t('admin_maintenance_create_success'))
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
          entityId: variables.vehicleId,
          entityType: 'MAINTENANCE',
          message: `Created maintenance request for vehicle #${variables.vehicleId}`,
          metadata: { cost: variables.cost, duration: variables.estimatedDurationDays }
        })
        .catch(() => undefined)
    },
    onError: () => {
      setCreateErrorMessage(t('admin_maintenance_create_error'))
    }
  })

  // Mutation to mark as complete (only when status = FUNDED)
  const completeMutation = useMutation<unknown, unknown, { id: number }>({
    mutationFn: (data) => technicianApi.completeMantainance(String(data.id)),
    onSuccess: (_, variables) => {
      toast.success(t('admin_maintenance_complete_success'))
      queryClient.invalidateQueries({ queryKey: ['technician', 'myMaintenances'] })
      auditApi
        .logAction({
          type: 'MAINTENANCE_COMPLETE',
          entityId: variables.id,
          entityType: 'MAINTENANCE',
          message: `Completed maintenance request #${variables.id}`
        })
        .catch(() => undefined)
    },
    onError: () => {
      showErrorToast({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        message: t('admin_maintenance_complete_error'),
        timestamp: new Date()
      })
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
      toast.success(t('admin_maintenance_bulk_complete_success', { count: selectedMaintenances.size }))
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
      showErrorToast({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        message: t('admin_maintenance_bulk_complete_error'),
        timestamp: new Date()
      })
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
      message.warning(t('admin_maintenance_no_funded_selected'))
      return
    }
    Modal.confirm({
      title: t('admin_maintenance_bulk_complete_title'),
      content: t('admin_maintenance_bulk_complete_content', { count: fundedIds.length }),
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
      setCreateErrorMessage(t('admin_maintenance_missing_info'))
      return
    }

    const errors = validateForm(form, t)
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
      { label: t('admin_maintenance_summary_open'), value: open, accent: 'bg-blue-50 text-blue-600 border-blue-100' },
      { label: t('admin_maintenance_summary_completed'), value: completed, accent: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      { label: t('admin_maintenance_summary_overdue'), value: overdue, accent: 'bg-rose-50 text-rose-600 border-rose-100' },
      { label: t('admin_maintenance_summary_total'), value: total, accent: 'bg-slate-50 text-slate-600 border-slate-100' }
    ]
  }, [maintenances, t])

  const boardColumns = useMemo(() => {
    return getStatusOrder(t).map((column) => ({
      ...column,
      items: filteredMaintenances.filter((item) => item.status === column.key)
    }))
  }, [filteredMaintenances, t])

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-4 sm:p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8 space-y-2'>
          <p className='text-xs font-semibold uppercase tracking-widest text-indigo-400'>{t('admin_check_vehicle_report_eyebrow')}</p>
          <h1 className='text-3xl font-bold text-gray-900'>{t('admin_maintenance_title')}</h1>
          <p className='text-gray-600'>{t('admin_maintenance_subtitle')}</p>
        </div>

        {/* Error Alerts */}
        {errorUser && (
          <Alert
            message={t('admin_maintenance_error_load_vehicles')}
            description={errorUserMsg?.message || t('admin_maintenance_error_try_later')}
            type='error'
            showIcon
            closable
            className='mb-4 rounded-lg shadow-sm border-l-4 border-red-500'
            action={
              <Button size='small' type='primary' onClick={() => queryClient.invalidateQueries({ queryKey: ['technician', 'rejectedUsers'] })}>
                {t('admin_dashboard_retry')}
              </Button>
            }
          />
        )}

        {errorMaint && (
          <Alert
            message={t('admin_maintenance_error_load_requests')}
            description={errorMaintMsg?.message || t('admin_maintenance_error_try_later')}
            type='error'
            showIcon
            closable
            className='mb-4 rounded-lg shadow-sm border-l-4 border-red-500'
            action={
              <Button size='small' type='primary' onClick={() => queryClient.invalidateQueries({ queryKey: ['technician', 'myMaintenances'] })}>
                {t('admin_dashboard_retry')}
              </Button>
            }
          />
        )}

        {/* Loading State */}
        {(loadingUser || loadingMaint) && (
          <div className='mb-6 flex items-center justify-center py-8 bg-white rounded-xl shadow-sm border border-gray-100'>
            <Spin size='large' />
            <span className='ml-3 text-gray-600 font-medium'>{t('admin_maintenance_loading')}</span>
          </div>
        )}

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
            <h2 className='text-xl font-bold text-gray-800 mb-4'>{t('admin_maintenance_vehicles_needing_title')}</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
              {userVehicleList.length === 0 && (
                <div className='text-slate-500 col-span-full'>{t('admin_maintenance_no_vehicles_require')}</div>
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
                      {t('admin_maintenance_owner')}: <span className='font-medium'>{vehicle.userName}</span>
                    </span>
                  </div>
                  <button
                    type='button'
                    className='w-full mt-4 rounded-xl bg-teal-600 text-white font-semibold py-2 shadow hover:bg-teal-700 transition disabled:opacity-60'
                    onClick={() => handleOpenCreate(vehicle)}
                    disabled={createMutation.isPending}
                  >
                    {t('admin_maintenance_create_button')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* List of existing maintenance requests */}
          <div>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <h2 className='text-xl font-bold text-gray-800'>{t('admin_maintenance_submitted_title')}</h2>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Input
                  placeholder={t('admin_maintenance_search_placeholder')}
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
                  <Select.Option value='ALL'>{t('admin_maintenance_status_all')}</Select.Option>
                  {getStatusOrder(t).map((status) => (
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
                  {hasActiveAdvancedFilters && <span className='mr-1'>({t('admin_check_group_filters_active')})</span>}
                  {t('admin_check_group_filters')}
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className='mb-4 rounded-2xl bg-white border border-gray-200 p-4'>
                <Space direction='vertical' size='middle' className='w-full'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_maintenance_filter_date_range')}</label>
                      <DatePicker.RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                        format='DD/MM/YYYY'
                        className='w-full'
                        placeholder={[t('admin_dashboard_range_from_date_placeholder'), t('admin_dashboard_range_to_date_placeholder')]}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_maintenance_filter_min_cost')}</label>
                      <InputNumber
                        value={minCost}
                        onChange={(value) => setMinCost(value ?? null)}
                        min={0}
                        placeholder={t('admin_check_group_filter_minimum')}
                        className='w-full'
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) || 0}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_maintenance_filter_max_cost')}</label>
                      <InputNumber
                        value={maxCost}
                        onChange={(value) => setMaxCost(value ?? null)}
                        min={0}
                        placeholder={t('admin_check_group_filter_maximum')}
                        className='w-full'
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) || 0}
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

            {/* Bulk Actions Bar */}
            {showBulkActions && selectedMaintenances.size > 0 && (
              <div className='mb-4 rounded-2xl bg-blue-50 border border-blue-200 p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm font-semibold text-blue-900'>
                      {t('admin_maintenance_selected_count', { count: selectedMaintenances.size })}
                      {filteredMaintenances.filter((m) => m.status === 'FUNDED' && selectedMaintenances.has(m.id))
                        .length > 0 && (
                        <span className='ml-2 text-xs text-blue-700'>
                          ({t('admin_maintenance_can_be_completed', { count: filteredMaintenances.filter((m) => m.status === 'FUNDED' && selectedMaintenances.has(m.id)).length })})
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
                      {t('admin_maintenance_bulk_complete_button')}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedMaintenances(new Set())
                        setShowBulkActions(false)
                      }}
                    >
                      {t('admin_check_group_clear_selection')}
                    </Button>
                  </Space>
                </div>
              </div>
            )}

            {filteredMaintenances.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-gray-200 bg-white/70 px-6 py-12 text-center text-gray-500'>
                {t('admin_maintenance_no_match')}
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
                          {t('admin_maintenance_empty_column')}
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
                                  {formatStatusLabel(item.status, t)}
                                </span>
                              </div>
                              <p className='mt-2 text-gray-600 line-clamp-2'>{item.description}</p>
                              <div className='mt-3 space-y-2 rounded-xl border border-gray-100 bg-slate-50 p-3 text-xs text-gray-600'>
                                <div className='flex justify-between'>
                                  <span>{t('admin_maintenance_estimated_cost')}</span>
                                  <strong>{formatCurrency(item.cost ?? item.actualCost)}</strong>
                                </div>
                                <div className='flex justify-between'>
                                  <span>{t('admin_maintenance_actual_cost')}</span>
                                  <strong className={hasActualCost ? 'text-emerald-600' : 'text-gray-400'}>
                                    {hasActualCost ? formatCurrency(item.actualCost) : t('admin_maintenance_pending')}
                                  </strong>
                                </div>
                                <div className='flex justify-between'>
                                  <span>{t('admin_maintenance_duration')}</span>
                                  <span>
                                    {item.estimatedDurationDays || '?'} {t('admin_maintenance_days')}
                                    {actualFinish && ` • ${t('admin_maintenance_finished', { date: actualFinish })}`}
                                  </span>
                                </div>
                                <div className='flex justify-between text-[11px] text-gray-500'>
                                  <span>{t('admin_maintenance_expected_finish')}</span>
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
                                  {completeMutation.isPending ? t('admin_maintenance_saving') : t('admin_maintenance_mark_completed')}
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
            <h3 className='text-lg font-bold text-teal-700 mb-2'>{t('admin_maintenance_modal_title')}</h3>
            {selectedVehicle && (
              <div className='mb-3 text-slate-600 text-sm'>
                {t('admin_maintenance_vehicle')}: <span className='font-semibold text-black'>{selectedVehicle.vehicleModel}</span>
                <span className='ml-2 text-teal-700'>{selectedVehicle.licensePlate}</span>
                <br />
                {t('admin_maintenance_owner')}: <span className='font-semibold text-black'>{selectedVehicle.userName}</span>
              </div>
            )}
            {createErrorMessage && (
              <div className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 mb-2 text-xs md:text-sm text-rose-700'>
                {createErrorMessage}
              </div>
            )}
            <form onSubmit={handleCreate} className='space-y-3' autoComplete='off'>
              <div>
                <label className='block text-xs font-medium text-teal-700 mb-1.5'>{t('admin_maintenance_modal_description_label')}</label>
                <textarea
                  name='description'
                  rows={2}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    formErrors.description
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600'
                  }`}
                  placeholder={t('admin_maintenance_modal_description_placeholder')}
                  value={form.description}
                  onChange={handleChange}
                />
                {formErrors.description && (
                  <div className='mt-1 text-[12px] text-rose-600'>{formErrors.description}</div>
                )}
              </div>
              <div>
                <label className='block text-xs font-medium text-teal-700 mb-1.5'>{t('admin_maintenance_modal_cost_label')}</label>
                <input
                  type='number'
                  name='cost'
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    formErrors.cost
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600'
                  }`}
                  placeholder={t('admin_maintenance_modal_cost_placeholder')}
                  value={form.cost}
                  onChange={handleChange}
                />
                {formErrors.cost && <div className='mt-1 text-[12px] text-rose-600'>{formErrors.cost}</div>}
              </div>
              <div>
                <label className='block text-xs font-medium text-teal-700 mb-1.5'>{t('admin_maintenance_modal_duration_label')}</label>
                <input
                  type='number'
                  name='estimatedDurationDays'
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    formErrors.estimatedDurationDays
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600'
                  }`}
                  placeholder={t('admin_maintenance_modal_duration_placeholder')}
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
                  {t('admin_maintenance_modal_cancel')}
                </button>
                <button
                  type='submit'
                  disabled={createMutation.isPending || !form.userId || !form.vehicleId}
                  className='rounded-xl bg-teal-600 px-5 py-2 text-xs md:text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed'
                >
                  {createMutation.isPending ? t('admin_maintenance_modal_creating') : t('admin_maintenance_modal_create_button')}
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
