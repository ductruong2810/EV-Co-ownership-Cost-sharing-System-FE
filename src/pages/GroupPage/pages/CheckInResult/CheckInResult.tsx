import { CheckCircleOutlined, CloseCircleOutlined, HomeOutlined, ScanOutlined } from '@ant-design/icons'
import { Button, Card, Modal } from 'antd'
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { toast } from 'react-toastify'
import path from '../../../../constants/path'
import groupApi from '../../../../apis/group.api'
import SignaturePad from '../../../../components/SignaturePad/SignaturePad'
import { useI18n } from '../../../../i18n/useI18n'

const CheckInResult: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { status, brand, licensePlate, startTime, endTime } = useParams()
  const [signature, setSignature] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    const storedQr = localStorage.getItem('pendingCheckInQr')
    if (storedQr && status === 'success' && !isConfirmed) {
      setQrCode(storedQr)
      setShowSignatureModal(true)
    }
  }, [status, isConfirmed])

  const confirmCheckInMutation = useMutation({
    mutationFn: (sig: string) => {
      if (!qrCode) throw new Error('QR code not found')
      return groupApi.confirmCheckIn(qrCode, sig)
    },
    onSuccess: () => {
      setIsConfirmed(true)
      setShowSignatureModal(false)
      localStorage.removeItem('pendingCheckInQr')
      toast.success(t('gp_checkin_signature_modal_toast_success'))
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ message?: string }>
      const message = axiosError.response?.data?.message || t('gp_checkin_signature_modal_toast_fail')
      toast.error(message)
    }
  })

  const handleConfirmWithSignature = () => {
    if (!signature) {
      toast.warning(t('gp_checkin_signature_modal_toast_warning'))
      return
    }
    confirmCheckInMutation.mutate(signature)
  }

  const handleSkipSignature = () => {
    if (window.confirm(t('gp_checkin_signature_modal_description'))) {
      if (qrCode) {
        confirmCheckInMutation.mutate('')
      }
      setShowSignatureModal(false)
      localStorage.removeItem('pendingCheckInQr')
    }
  }

  const handleRetry = () => {
    navigate(-1)
  }

  const handleGoHome = () => {
    navigate(path.dashBoard)
  }

  return (
    <>
      {status === 'fail' ? (
        <div className='max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center'>
          <div className='flex justify-center mb-6'>
            <div className='w-24 h-24 bg-red-100 rounded-full flex items-center justify-center'>
              <CloseCircleOutlined className='text-6xl text-red-500' />
            </div>
          </div>

          <h1 className='text-2xl font-bold text-gray-800 mb-3'>{t('gp_checkin_fail_title')}</h1>
          <p className='text-gray-600 mb-2'>{t('gp_checkin_fail_message')}</p>

          <div className='inline-block bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-6'>
            <span className='text-sm text-red-700'>
              {t('gp_checkin_fail_error_code')} <span className='font-semibold'>FAIL</span>
            </span>
          </div>

          <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
            <h3 className='font-semibold text-gray-800 mb-3 text-sm'>{t('gp_checkin_fail_try_again')}</h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li className='flex items-start'>
                <span className='mr-2'>•</span>
                <span>{t('gp_checkin_fail_solution1')}</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2'>•</span>
                <span>{t('gp_checkin_fail_solution2')}</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2'>•</span>
                <span>{t('gp_checkin_fail_solution3')}</span>
              </li>
            </ul>
          </div>

          <div className='flex flex-col gap-3'>
            <Button
              type='primary'
              size='large'
              icon={<ScanOutlined />}
              onClick={handleRetry}
              className='w-full bg-blue-600 hover:bg-blue-700'
            >
              {t('gp_checkin_fail_scan_button')}
            </Button>

            <Button size='large' icon={<HomeOutlined />} onClick={handleGoHome} className='w-full'>
              {t('gp_checkin_fail_go_home_button')}
            </Button>
          </div>
        </div>
      ) : (
        <div className='bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-8 w-full max-w-lg text-center animate-fade-in'>
          <div className='flex justify-center mb-6'>
            <div className='w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-md'>
              <CheckCircleOutlined className='text-6xl text-green-500' />
            </div>
          </div>

          <h1 className='text-3xl font-bold text-green-600 mb-2'>{t('gp_checkin_success_title')}</h1>
          <p className='text-gray-600 mb-6'>{t('gp_checkin_success_message')}</p>

          <Card
            title={<span className='font-semibold text-gray-700'>{t('gp_checkin_trip_info_title')}</span>}
            className='rounded-2xl shadow-md text-left mb-4 border-none bg-white/90 backdrop-blur-sm'
          >
            <p>
              <b>{t('gp_checkin_status_label')}</b> <span className='text-green-600'>{t('gp_checkin_status_success')}</span>
            </p>
            <p>
              <b>
                {t('gp_checkin_time_label')} {new Date(startTime as string).toLocaleTimeString('en-US')}
                {'    '} - {new Date(endTime as string).toLocaleTimeString('en-US')}
              </b>
            </p>
          </Card>

          <Card
            title={<span className='font-semibold text-gray-700'>{t('gp_checkin_vehicle_info_title')}</span>}
            className='rounded-2xl shadow-md text-left border-none bg-white/90 backdrop-blur-sm mb-6'
          >
            <p>
              <b>{t('gp_checkin_license_plate_label')}</b> {licensePlate}
            </p>
            <p>
              <b>{t('gp_checkin_brand_label')}</b> {brand}
            </p>
          </Card>

          <div className='flex flex-col sm:flex-row gap-3'>
            <Button
              type='primary'
              size='large'
              icon={<HomeOutlined />}
              onClick={handleGoHome}
              className='flex-1 bg-green-500 hover:bg-green-600 border-none text-white font-semibold rounded-xl shadow'
            >
              {t('gp_checkin_go_home_button')}
            </Button>
            <Button
              size='large'
              icon={<ScanOutlined />}
              onClick={handleRetry}
              className='flex-1 border-green-400 text-green-600 hover:bg-green-50 rounded-xl'
            >
              {t('gp_checkin_scan_again_button')}
            </Button>
          </div>
        </div>
      )}

      <Modal
        title={t('gp_checkin_signature_modal_title')}
        open={showSignatureModal}
        onCancel={handleSkipSignature}
        footer={[
          <Button key='skip' onClick={handleSkipSignature}>
            {t('gp_checkin_signature_modal_skip')}
          </Button>,
          <Button
            key='confirm'
            type='primary'
            onClick={handleConfirmWithSignature}
            loading={confirmCheckInMutation.isPending}
            disabled={!signature}
          >
            {t('gp_checkin_signature_modal_confirm')}
          </Button>
        ]}
        width={600}
        closable={false}
        maskClosable={false}
      >
        <div className='space-y-4'>
          <p className='text-gray-600'>{t('gp_checkin_signature_modal_description')}</p>
          <SignaturePad onSignatureChange={setSignature} width={550} height={200} required={false} />
        </div>
      </Modal>
    </>
  )
}

export default CheckInResult

