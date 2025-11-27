import { CheckCircleOutlined, CloseCircleOutlined, HomeOutlined, ScanOutlined } from '@ant-design/icons'
import { Button, Card, Modal } from 'antd'
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import path from '../../../../constants/path'
import groupApi from '../../../../apis/group.api'
import SignaturePad from '../../../../components/SignaturePad/SignaturePad'

const CheckInResult: React.FC = () => {
  const navigate = useNavigate()
  const { status, brand, licensePlate, startTime, endTime } = useParams()
  const [signature, setSignature] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    // Get QR code from localStorage
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
      toast.success('Check-in confirmed with digital signature!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-in confirmation failed')
    }
  })

  const handleConfirmWithSignature = () => {
    if (!signature) {
      toast.warning('Please sign to confirm check-in')
      return
    }
    confirmCheckInMutation.mutate(signature)
  }

  const handleSkipSignature = () => {
    if (window.confirm('Are you sure you want to skip digital signature? Signature helps protect your rights.')) {
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
          {/* Error Icon */}
          <div className='flex justify-center mb-6'>
            <div className='w-24 h-24 bg-red-100 rounded-full flex items-center justify-center'>
              <CloseCircleOutlined className='text-6xl text-red-500' />
            </div>
          </div>

          {/* Error Title */}
          <h1 className='text-2xl font-bold text-gray-800 mb-3'>Check-in Failed</h1>

          {/* Error Message */}
          <p className='text-gray-600 mb-2'>Invalid QR code format</p>

          {/* Error Status */}
          <div className='inline-block bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-6'>
            <span className='text-sm text-red-700'>
              Error Code: <span className='font-semibold'>FAIL</span>
            </span>
          </div>

          {/* Suggested Solutions */}
          <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
            <h3 className='font-semibold text-gray-800 mb-3 text-sm'>Please try:</h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li className='flex items-start'>
                <span className='mr-2'>•</span>
                <span>Ensure the QR code is not blurry or damaged</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2'>•</span>
                <span>Check if the QR code has the correct format</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2'>•</span>
                <span>Request a new QR code from administrator</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-col gap-3'>
            <Button
              type='primary'
              size='large'
              icon={<ScanOutlined />}
              onClick={handleRetry}
              className='w-full bg-blue-600 hover:bg-blue-700'
            >
              Scan QR Code Again
            </Button>

            <Button size='large' icon={<HomeOutlined />} onClick={handleGoHome} className='w-full'>
              Về Trang Chủ
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

          <h1 className='text-3xl font-bold text-green-600 mb-2'>Check-in Successful!</h1>
          <p className='text-gray-600 mb-6'>Your vehicle is ready to use.</p>

          {/* Thông tin chuyến đi */}
          <Card
            title={<span className='font-semibold text-gray-700'>Trip Information</span>}
            className='rounded-2xl shadow-md text-left mb-4 border-none bg-white/90 backdrop-blur-sm'
          >
            <p>
              <b>Status:</b> <span className='text-green-600'>Success</span>
            </p>
            <p>
              <b>
                Time: {new Date(startTime as string).toLocaleTimeString('en-US')}
                {'    '} - {new Date(endTime as string).toLocaleTimeString('en-US')}
              </b>
            </p>
          </Card>

          {/* Vehicle Information */}
          <Card
            title={<span className='font-semibold text-gray-700'>Vehicle Information</span>}
            className='rounded-2xl shadow-md text-left border-none bg-white/90 backdrop-blur-sm mb-6'
          >
            <p>
              <b>License Plate:</b> {licensePlate}
            </p>
            <p>
              <b>Brand:</b> {brand}
            </p>
          </Card>

          {/* Navigation Buttons */}
          <div className='flex flex-col sm:flex-row gap-3'>
            <Button
              type='primary'
              size='large'
              icon={<HomeOutlined />}
              onClick={handleGoHome}
              className='flex-1 bg-green-500 hover:bg-green-600 border-none text-white font-semibold rounded-xl shadow'
            >
              Go to Home
            </Button>
            <Button
              size='large'
              icon={<ScanOutlined />}
              onClick={handleRetry}
              className='flex-1 border-green-400 text-green-600 hover:bg-green-50 rounded-xl'
            >
              Scan Again
            </Button>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      <Modal
        title='Confirm Check-in with Digital Signature'
        open={showSignatureModal}
        onCancel={handleSkipSignature}
        footer={[
          <Button key='skip' onClick={handleSkipSignature}>
            Skip
          </Button>,
          <Button
            key='confirm'
            type='primary'
            onClick={handleConfirmWithSignature}
            loading={confirmCheckInMutation.isPending}
            disabled={!signature}
          >
            Confirm
          </Button>
        ]}
        width={600}
        closable={false}
        maskClosable={false}
      >
        <div className='space-y-4'>
          <p className='text-gray-600'>
            Please sign to confirm check-in. Digital signature helps protect your rights and increases legal validity.
          </p>
          <SignaturePad
            onSignatureChange={setSignature}
            width={550}
            height={200}
            required={false}
          />
        </div>
      </Modal>
    </>
  )
}

export default CheckInResult
