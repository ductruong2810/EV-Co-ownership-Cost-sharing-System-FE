import React from 'react'
import { Modal, Button, Space } from 'antd'
import { ErrorInfo, ErrorSeverity, ErrorType } from '../../types/error.type'
import {
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  HomeOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

interface ErrorModalProps {
  error: ErrorInfo | null
  visible: boolean
  onClose: () => void
  onRetry?: () => void
}

const ErrorModal: React.FC<ErrorModalProps> = ({ error, visible, onClose, onRetry }) => {
  const navigate = useNavigate()
  
  if (!error) return null

  const getIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return <CloseCircleOutlined className='text-6xl text-red-500' />
      case ErrorSeverity.HIGH:
        return <ExclamationCircleOutlined className='text-6xl text-orange-500' />
      default:
        return <WarningOutlined className='text-6xl text-yellow-500' />
    }
  }

  const getTitle = () => {
    if (error.title) return error.title
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'Critical Error'
      case ErrorSeverity.HIGH:
        return 'Error Occurred'
      default:
        return 'Warning'
    }
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={500}
      className='error-modal'
    >
      <div className='text-center py-6'>
        <div className='mb-6 flex justify-center'>{getIcon()}</div>
        
        <h2 className='text-2xl font-bold text-gray-900 mb-3'>{getTitle()}</h2>
        
        <p className='text-gray-700 mb-4 text-base'>{error.message}</p>
        
        {error.details && (
          <div className='mb-4 p-3 bg-gray-50 rounded-lg text-left'>
            <p className='text-sm text-gray-600'>{error.details}</p>
          </div>
        )}

        {error.code && (
          <p className='text-xs text-gray-500 mb-6'>
            Error Code: {error.code}
          </p>
        )}

        <Space size='middle' className='w-full justify-center'>
          {error.retryable && onRetry && (
            <Button
              type='primary'
              icon={<ReloadOutlined />}
              onClick={() => {
                onRetry()
                onClose()
              }}
              size='large'
            >
              Retry
            </Button>
          )}
          
          {error.type === ErrorType.NETWORK && (
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  navigate('/', { replace: true })
                } catch (err) {
                  console.warn('Navigate failed, using window.location:', err)
                  window.location.href = '/'
                }
                onClose()
              }}
              size='large'
            >
              <HomeOutlined /> Go to Home
            </Button>
          )}
          
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (error.type === ErrorType.AUTHENTICATION) {
                try {
                  navigate('/login', { replace: true })
                } catch (err) {
                  console.warn('Navigate failed, using window.location:', err)
                  window.location.href = '/login'
                }
              } else {
                onClose()
              }
            }}
            size='large'
          >
            {error.type === ErrorType.AUTHENTICATION ? (
              <>
                <HomeOutlined /> Go to Login
              </>
            ) : (
              'Close'
            )}
          </Button>
        </Space>
      </div>
    </Modal>
  )
}

export default ErrorModal

