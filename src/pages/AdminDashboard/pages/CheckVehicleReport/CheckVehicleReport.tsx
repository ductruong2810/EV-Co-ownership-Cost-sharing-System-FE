import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Input, Select, Tag, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import technicianApi from '../../../../apis/technician.api'
import auditApi from '../../../../apis/audit.api'
import type { VehicleCheck } from '../../../../types/api/technician.type'
import { toast } from 'react-toastify'
import { useI18n } from '../../../../i18n/useI18n'
import { showErrorToast } from '../../../../components/Error/ErrorToast'
import { ErrorType, ErrorSeverity } from '../../../../types/error.type'

const STATUS_COLORS = {
  PENDING: 'bg-lime-50 text-lime-600 animate-pulse',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700'
} as const

const CHECK_TYPE_COLORS = {
  POST_USE: 'bg-emerald-50 text-emerald-700',
  PRE_USE: 'bg-lime-50 text-lime-700'
} as const

const METRIC_STYLES = {
  odometer: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
  battery: 'from-lime-50 to-lime-100 border-lime-200 text-lime-700',
  cleanliness: 'from-green-50 to-green-100 border-green-200 text-green-700'
} as const

export function CheckVehicleReport() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['vehicleChecks'],
    queryFn: () => technicianApi.getAllVehicleCheck(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1
  })

  if (isError) return <ErrorState error={error as Error} onRetry={() => refetch()} />

  const reportData: VehicleCheck[] = data?.data ?? []

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const summary = useMemo(() => {
    const total = reportData.length
    const pending = reportData.filter((r) => r.status === 'PENDING').length
    const approved = reportData.filter((r) => r.status === 'APPROVED').length
    const rejected = reportData.filter((r) => r.status === 'REJECTED').length
    return { total, pending, approved, rejected }
  }, [reportData])

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return reportData.filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
      const matchesSearch =
        !term ||
        r.vehicleModel.toLowerCase().includes(term) ||
        r.licensePlate.toLowerCase().includes(term) ||
        r.issues?.toLowerCase().includes(term) ||
        r.notes?.toLowerCase().includes(term)
      return matchesStatus && matchesSearch
    })
  }, [reportData, statusFilter, searchTerm])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBatchUpdate = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedIds.size) return
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          technicianApi.checkReport(String(id), status).then(() =>
            auditApi
              .logAction({
                type: 'VEHICLE_REPORT_REVIEW',
                entityId: id,
                entityType: 'VEHICLE_CHECK',
                message: `Batch ${status === 'APPROVED' ? 'approved' : 'rejected'} report #${id}`
              })
              .catch(() => undefined)
          )
        )
      )
      toast.success(t('admin_check_vehicle_report_batch_success', { count: selectedIds.size }))
      clearSelection()
      queryClient.invalidateQueries({ queryKey: ['vehicleChecks'] })
    } catch (err) {
      console.error(err)
      showErrorToast({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        message: t('admin_check_vehicle_report_batch_error'),
        timestamp: new Date()
      })
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6'>
      <div className='max-w-6xl mx-auto'>
        <PageHeader
          totalReports={summary.total}
          pending={summary.pending}
          approved={summary.approved}
          rejected={summary.rejected}
        />

        {/* Loading State */}
        {isPending && (
          <div className='mb-6 flex items-center justify-center py-8 bg-white rounded-xl shadow-sm border border-gray-100'>
            <Spin size='large' />
            <span className='ml-3 text-gray-600 font-medium'>{t('admin_check_vehicle_report_loading')}</span>
          </div>
        )}

        <section className='mb-5 grid gap-3 md:grid-cols-4'>
          <SummaryCard label={t('admin_check_vehicle_report_summary_pending')} value={summary.pending} color='bg-amber-50 text-amber-700 border-amber-100' />
          <SummaryCard
            label={t('admin_check_vehicle_report_summary_approved')}
            value={summary.approved}
            color='bg-emerald-50 text-emerald-700 border-emerald-100'
          />
          <SummaryCard label={t('admin_check_vehicle_report_summary_rejected')} value={summary.rejected} color='bg-rose-50 text-rose-700 border-rose-100' />
          <SummaryCard
            label={t('admin_check_vehicle_report_summary_total')}
            value={summary.total}
            color='bg-slate-50 text-slate-700 border-slate-100'
          />
        </section>

        {selectedIds.size > 0 && (
          <div className='mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 shadow'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <span>
                <strong>{selectedIds.size}</strong> {t('admin_check_vehicle_report_selected_count', { count: selectedIds.size })}
              </span>
              <div className='flex gap-2 text-xs font-semibold'>
                <button
                  onClick={() => handleBatchUpdate('REJECTED')}
                  className='rounded-lg border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50'
                >
                  {t('admin_check_vehicle_report_reject')}
                </button>
                <button
                  onClick={() => handleBatchUpdate('APPROVED')}
                  className='rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700'
                >
                  {t('admin_check_vehicle_report_approve')}
                </button>
                <button onClick={clearSelection} className='rounded-lg border px-3 py-1 text-gray-500 hover:bg-gray-50'>
                  {t('admin_check_vehicle_report_clear')}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className='mb-5 flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-sm font-semibold text-emerald-900'>{t('admin_check_vehicle_report_filters')}</p>
            <p className='text-xs text-gray-500'>
              {t('admin_check_vehicle_report_showing', { showing: filteredReports.length, total: reportData.length })}
            </p>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <Input
              placeholder={t('admin_check_vehicle_report_search_placeholder')}
              prefix={<SearchOutlined className='text-gray-400' />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              className='w-full sm:w-72'
              size='large'
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              className='w-full sm:w-44'
              size='large'
            >
              <Select.Option value='ALL'>{t('admin_check_vehicle_report_status_all')}</Select.Option>
              <Select.Option value='PENDING'>{t('admin_check_vehicle_report_status_pending')}</Select.Option>
              <Select.Option value='APPROVED'>{t('admin_check_vehicle_report_status_approved')}</Select.Option>
              <Select.Option value='REJECTED'>{t('admin_check_vehicle_report_status_rejected')}</Select.Option>
            </Select>
          </div>
        </section>

        <div className='space-y-3'>
          {filteredReports.length ? (
            filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['vehicleChecks'] })}
                selected={selectedIds.has(report.id)}
                onToggleSelect={() => toggleSelect(report.id)}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}

const SummaryCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${color}`}>
    <p className='text-[11px] uppercase tracking-wide text-gray-400'>{label}</p>
    <p className='mt-1 text-2xl'>{value}</p>
  </div>
)

const PageHeader = ({
  totalReports,
  pending,
  approved,
  rejected
}: {
  totalReports: number
  pending: number
  approved: number
  rejected: number
}) => {
  const { t } = useI18n()
  return (
    <div className='mb-8'>
      <p className='text-xs font-semibold uppercase tracking-widest text-emerald-400'>{t('admin_check_vehicle_report_eyebrow')}</p>
      <h1 className='mt-1 text-3xl font-bold text-gray-900'>{t('admin_check_vehicle_report_title')}</h1>
      <p className='text-gray-600'>
        {t('admin_check_vehicle_report_subtitle', { total: totalReports, pending, approved, rejected })}
      </p>
    </div>
  )
}

const EmptyState = () => {
  const { t } = useI18n()
  return (
    <div className='text-center py-24'>
      <div className='inline-block mb-4'>
        <div className='w-20 h-20 bg-gradient-to-br from-emerald-100 to-lime-100 rounded-full flex items-center justify-center'>
          <span className='text-2xl font-bold text-emerald-600'>OK</span>
        </div>
      </div>
      <p className='text-green-500 text-lg font-medium'>{t('admin_check_vehicle_report_empty_title')}</p>
      <p className='text-green-400 text-sm mt-1'>{t('admin_check_vehicle_report_empty_desc')}</p>
    </div>
  )
}

const ErrorState = ({ error, onRetry }: { error: Error | null; onRetry?: () => void }) => {
  const { t } = useI18n()
  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6 flex items-center justify-center'>
      <div className='bg-white rounded-2xl shadow-lg p-8 border border-red-200 max-w-md text-center space-y-4'>
        <p className='text-red-700 font-semibold'>
          {error instanceof Error ? error.message : t('admin_check_vehicle_report_error_load')}
        </p>
        {onRetry && (
          <button
            type='button'
            onClick={onRetry}
            className='rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700'
          >
            {t('admin_dashboard_retry')}
          </button>
        )}
      </div>
    </div>
  )
}

function ReportCard({
  report,
  onStatusChange,
  selected,
  onToggleSelect
}: {
  report: VehicleCheck
  onStatusChange: () => void
  selected: boolean
  onToggleSelect: () => void
}) {
  const { t } = useI18n()
  const isPending = report.status === 'PENDING'
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

  const { mutate: checkReport, isPending: isSubmitting } = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => technicianApi.checkReport(String(report.id), status),
    onSuccess: (_data, variables) => {
      auditApi
        .logAction({
          type: 'VEHICLE_REPORT_REVIEW',
          entityId: report.id,
          entityType: 'VEHICLE_CHECK',
          message: `${variables === 'APPROVED' ? 'Approved' : 'Rejected'} report #${report.id}`
        })
        .catch(() => undefined)
      onStatusChange()
    },
    onError: (error) => console.error('Error updating status:', error)
  })

  return (
    <div
      className={` 
        bg-white rounded-xl border border-gray-200 shadow-lg p-6 
        hover:shadow-xl hover:border-emerald-300 transition-all
        ${isPending ? 'ring-1 ring-lime-100' : ''}
      `}
    >
      {/* Header */}
      <div className='flex items-center gap-4 mb-4 pb-4 border-b border-green-100'>
        <label className='flex items-center gap-2 text-xs text-gray-400'>
          <input
            type='checkbox'
            checked={selected}
            onChange={onToggleSelect}
            className='h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500'
          />
          {t('admin_check_vehicle_report_select')}
        </label>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold
            ${isPending ? 'bg-emerald-100 text-emerald-600' : 'bg-green-100 text-green-500'}
          `}
        >
          {isPending ? t('admin_check_vehicle_report_new') : t('admin_check_vehicle_report_ok')}
        </div>
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <h3 className='font-semibold text-emerald-900'>{t('admin_check_vehicle_report_report_id', { id: report.id })}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${CHECK_TYPE_COLORS[report.checkType]}`}>
              {report.checkType === 'POST_USE' ? t('admin_check_vehicle_report_after_use') : t('admin_check_vehicle_report_before_use')}
            </span>
          </div>
          <p className='text-xs text-green-500 mt-1'>{formatDate(report.createdAt)}</p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${STATUS_COLORS[report.status]}`}
        >
          {report.status === 'PENDING' ? t('admin_check_vehicle_report_status_pending') : report.status === 'APPROVED' ? t('admin_check_vehicle_report_status_approved') : t('admin_check_vehicle_report_status_rejected')}
        </span>
      </div>

      {/* Metrics */}
      <div className='grid grid-cols-3 gap-2 mb-4'>
        <MetricCard label={t('admin_check_vehicle_report_metric_km')} value={report.odometer} style={METRIC_STYLES.odometer} />
        <MetricCard label={t('admin_check_vehicle_report_metric_battery')} value={`${report.batteryLevel}%`} style={METRIC_STYLES.battery} />
        <MetricCard label={t('admin_check_vehicle_report_metric_cleanliness')} value={report.cleanliness ?? '—'} style={METRIC_STYLES.cleanliness} />
      </div>

      {/* Notes & Issues */}
      {(report.issues || report.notes) && (
        <div className='mb-4 space-y-2'>
          {report.issues && (
            <div className='bg-red-50 border-l-4 border-red-400 px-3 py-2 rounded-r text-sm'>
              <span className='font-bold text-red-700'>{t('admin_check_vehicle_report_issues')}:</span>
              <span className='ml-2 text-red-600'>{report.issues}</span>
            </div>
          )}
          {report.notes && (
            <div className='bg-green-50 border-l-4 border-green-400 px-3 py-2 rounded-r text-sm'>
              <span className='font-bold text-green-700'>{t('admin_check_vehicle_report_notes')}:</span>
              <span className='ml-2 text-green-600'>{report.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className='flex gap-2 pt-4 border-t border-green-100'>
          <button
            onClick={() => checkReport('REJECTED')}
            disabled={isSubmitting}
            className='flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-2 border-red-300 hover:from-red-100 hover:to-red-200 hover:shadow-lg hover:shadow-red-500/10 disabled:opacity-50'
          >
            {isSubmitting ? t('admin_check_vehicle_report_processing') : t('admin_check_vehicle_report_reject')}
          </button>
          <button
            onClick={() => checkReport('APPROVED')}
            disabled={isSubmitting}
            className='flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-emerald-600 to-lime-700 text-white hover:from-lime-700 hover:to-green-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50'
          >
            {isSubmitting ? t('admin_check_vehicle_report_processing') : t('admin_check_vehicle_report_approve')}
          </button>
        </div>
      )}
    </div>
  )
}

const MetricCard = ({ label, value, style }: { label: string; value: string | number; style: string }) => (
  <div className={`bg-gradient-to-br ${style} rounded-lg p-3 border`}>
    <p className='text-xs font-bold uppercase mb-1 opacity-75'>{label}</p>
    <p className='text-2xl font-black'>{value}</p>
  </div>
)

export default CheckVehicleReport
