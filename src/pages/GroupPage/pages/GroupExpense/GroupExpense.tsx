import { useMutation, useQuery } from '@tanstack/react-query'
import userApi from '../../../../apis/user.api'
import { useState } from 'react'
import Skeleton from '../../../../components/Skeleton'
import { FaCheckCircle } from 'react-icons/fa'
import { ClockCircleOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons'
import { useI18n } from '../../../../i18n/useI18n'

interface MaintenancePayment {
  id: number
  description: string
  actualCost: number | string // BigDecimal từ backend có thể là string
  estimatedDurationDays: number | null
  vehicleModel: string
  status: string
  requestedByName: string
}

export default function GroupExpense() {
  const paymentMaintanceQuery = useQuery({
    queryKey: ['payment-maintance'],
    queryFn: () => userApi.getAllPaymentMaintance(),
    onError: (error) => {
      console.error('Error fetching maintenance payments:', error)
    }
  })

  const paymentMaintenanceMutation = useMutation({
    mutationFn: (maintenanceId: string) => userApi.paymentMaintenance(maintenanceId),
    onSuccess: (response) => {
      window.open(`${response?.data?.vnpayUrl}`, '_blank')
    }
  })

  const handlePayment = (maintenanceId: string) => {
    paymentMaintenanceMutation.mutate(maintenanceId)
  }

  const [selectedItem, setSelectedItem] = useState<MaintenancePayment | null>(null)
  const { t } = useI18n()

  const formatVND = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount)) return '0 ₫'
    return numAmount.toLocaleString('vi-VN') + ' ₫'
  }

  // Badge and UI now use blue as primary palette
  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; label: string } } = {
      PENDING: { bg: 'bg-blue-50', text: 'text-blue-700', label: t('ge_status_pending') },
      FUNDED: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('ge_status_funded') },
      COMPLETED: { bg: 'bg-blue-200', text: 'text-blue-900', label: t('ge_status_completed') }
    }
    const config = statusConfig[status] || statusConfig.PENDING
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>{config.label}</span>
    )
  }

  // Debug: Log data
  if (paymentMaintanceQuery?.data) {
    console.log('Maintenance payments data:', paymentMaintanceQuery.data)
  }

  // Loading skeleton
  if (paymentMaintanceQuery.isLoading) {
    return <Skeleton />
  }

  // Error state
  if (paymentMaintanceQuery.isError) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 p-8 bg-white rounded-2xl shadow-xl border border-red-200 max-w-xl mx-auto my-20'>
        <div className='flex-shrink-0 w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl text-red-600'>
          <CloseOutlined className='w-8 h-8' />
        </div>
        <div className='flex-1 min-w-0 text-center'>
          <p className='font-semibold text-gray-900 mb-2'>Error loading maintenance payments</p>
          <p className='text-sm text-gray-600'>
            {paymentMaintanceQuery.error instanceof Error
              ? paymentMaintanceQuery.error.message
              : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    )
  }

  // Check if data exists and is array
  const maintenanceList = paymentMaintanceQuery?.data?.data
  if (!maintenanceList || !Array.isArray(maintenanceList) || maintenanceList.length === 0) {
    return (
      <div className='flex items-center gap-4 p-8 bg-white rounded-2xl shadow-xl border border-dashed border-blue-200 max-w-xl mx-auto my-20'>
        <div className='flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-100 rounded-xl text-blue-600'>
          <FaCheckCircle className='w-8 h-8' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='font-semibold text-gray-900'>{t('ge_empty_title')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-200 p-6 my-10 rounded-2xl shadow-lg'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-6'>
            <div>
              <h2 className='text-3xl font-bold text-blue-900 mb-2'>{t('ge_header_title')}</h2>
              <p className='text-blue-600'>
                {t('ge_header_total')}: {maintenanceList.length || 0}
              </p>
            </div>
          <div className='flex items-center gap-3'>
            <span className='inline-block w-12 h-12 rounded-2xl shadow-lg bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-xl font-bold'>
              {maintenanceList.length || 0}
            </span>
            <span className='text-sm text-blue-800'>{t('ge_header_active')}</span>
          </div>
        </div>

        {/* List with wide horizontal cards */}
        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8'>
          {maintenanceList.map((item: any) => {
            // Map backend DTO to frontend interface
            const mappedItem: MaintenancePayment = {
              id: item.id,
              description: item.description || '',
              actualCost: item.actualCost != null ? (typeof item.actualCost === 'string' ? parseFloat(item.actualCost) : item.actualCost) : 0,
              estimatedDurationDays: item.estimatedDurationDays ?? 0,
              vehicleModel: item.vehicleModel || 'Unknown',
              status: item.status || 'PENDING',
              requestedByName: item.requestedByName || 'Unknown'
            }
            return (
            <div
              key={mappedItem.id}
              onClick={() => setSelectedItem(mappedItem)}
              className='group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-blue-100 hover:border-blue-500 overflow-hidden'
            >
              {/* Gradient hover, blue only */}
              <div className='absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />

              <div className='relative flex flex-col h-full z-10'>
                <div className='flex items-center mb-4'>
                  <div className='w-14 h-14 bg-gradient-to-br from-blue-700 to-blue-400 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg'>
                    {mappedItem.vehicleModel.charAt(0)}
                  </div>
                  <div className='ml-4 flex flex-col'>
                    <h3 className='font-bold text-xl text-blue-900 group-hover:text-blue-700 transition-colors'>
                      {mappedItem.vehicleModel}
                    </h3>
                    <p className='text-xs text-blue-500'>ID: #{mappedItem.id}</p>
                    <p className='text-xs text-blue-700 mt-1'>
                      By <span className='font-medium'>{mappedItem.requestedByName}</span>
                    </p>
                  </div>
                </div>
                <p className='text-blue-800 mb-3 line-clamp-2'>{mappedItem.description}</p>
                <div className='flex items-center gap-3 flex-wrap mb-2'>
                  {getStatusBadge(mappedItem.status)}
                  <span className='text-xs text-blue-600 flex items-center gap-1'>
                    <ClockCircleOutlined className='text-blue-500 w-4 h-4' />
                    {mappedItem.estimatedDurationDays || 0} days
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <div className='text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-400'>
                    {formatVND(mappedItem.actualCost)}
                  </div>
                  <p className='text-xs text-blue-400 mt-1'>{t('ge_card_cost_label')}</p>
                  <div className='opacity-0 group-hover:opacity-100 transition translate-x-2'>
                    <RightOutlined className='text-blue-600 text-xl' />
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {/* Modal */}
        {selectedItem && (
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
            onClick={() => setSelectedItem(null)}
          >
            <div
              className='bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform transition-all'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className='bg-gradient-to-r from-blue-700 to-blue-400 p-7 text-white'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-2xl font-bold mb-1'>Maintenance Details</h3>
                    <p className='text-blue-100 text-sm'>{selectedItem.vehicleModel}</p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className='w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors'
                  >
                    <CloseOutlined className='!text-white' />
                  </button>
                </div>
              </div>

              {/* Modal content */}
              <div className='p-7 space-y-4'>
                <div className='bg-blue-50 rounded-xl p-4'>
                  <label className='text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 block'>
                    Description
                  </label>
                  <p className='text-blue-900 leading-relaxed'>{selectedItem.description}</p>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-blue-100 rounded-xl p-4'>
                    <label className='text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2 block'>
                      {t('ge_card_cost_label')}
                    </label>
                    <p className='text-2xl font-bold text-blue-900'>{formatVND(selectedItem.actualCost)}</p>
                  </div>
                  <div className='bg-blue-200 rounded-xl p-4'>
                    <label className='text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 block'>
                      {t('ge_card_duration_label')}
                    </label>
                    <p className='text-2xl font-bold text-blue-900'>{selectedItem.estimatedDurationDays}</p>
                    <p className='text-xs text-blue-700 mt-1'>{t('ge_card_duration_unit')}</p>
                  </div>
                </div>
                <div className='bg-blue-50 rounded-xl p-4'>
                  <label className='text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 block'>
                    {t('ge_modal_status_label')}
                  </label>
                  <div className='flex items-center gap-2'>
                    {getStatusBadge(selectedItem.status)}
                    <span className='text-sm text-blue-800'>• ID: #{selectedItem.id}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className='p-7 bg-blue-50 border-t flex gap-4 rounded-b-3xl'>
                <button
                  onClick={() => setSelectedItem(null)}
                  className='w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-300 shadow-lg'
                >
                  {t('ge_modal_close_button')}
                </button>
                <button
                  onClick={() => handlePayment(selectedItem?.id.toString() || '')}
                  className='w-full bg-gradient-to-r from-blue-700 to-blue-400 text-white py-3 rounded-xl font-semibold hover:from-blue-900 hover:to-blue-600 transition-all shadow-lg'
                >
                  {t('ge_modal_pay_button')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
