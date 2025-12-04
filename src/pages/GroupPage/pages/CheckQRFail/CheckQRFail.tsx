import { useNavigate } from 'react-router-dom'
import path from '../../../../constants/path'
import { CloseCircleOutlined, HomeOutlined, ScanOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useI18n } from '../../../../i18n/useI18n'

export default function CheckQRFail() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleRetry = () => {
    navigate(-1)
  }

  const handleGoHome = () => {
    navigate(path.dashBoard)
  }

  return (
    <div>
      <div className='max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center'>
        <div className='flex justify-center mb-6'>
          <div className='w-24 h-24 bg-red-100 rounded-full flex items-center justify-center'>
            <CloseCircleOutlined className='text-6xl text-red-500' />
          </div>
        </div>

        <h1 className='text-2xl font-bold text-gray-800 mb-3'>{t('gp_checkqrfail_title')}</h1>
        <p className='text-gray-600 mb-2'>{t('gp_checkqrfail_message')}</p>

        <div className='inline-block bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-6'>
          <span className='text-sm text-red-700'>
            {t('gp_checkqrfail_error_code')} <span className='font-semibold'>FAIL</span>
          </span>
        </div>

        <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
          <h3 className='font-semibold text-gray-800 mb-3 text-sm'>{t('gp_checkqrfail_try_again')}</h3>
          <ul className='space-y-2 text-sm text-gray-600'>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span>{t('gp_checkqrfail_solution1')}</span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span>{t('gp_checkqrfail_solution2')}</span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span>{t('gp_checkqrfail_solution3')}</span>
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
            {t('gp_checkqrfail_scan_again_button')}
          </Button>

          <Button size='large' icon={<HomeOutlined />} onClick={handleGoHome} className='w-full'>
            {t('gp_checkqrfail_go_home_button')}
          </Button>
        </div>
      </div>
    </div>
  )
}

