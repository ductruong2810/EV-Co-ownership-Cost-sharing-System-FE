import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import groupApi from '../../../../apis/group.api'
import { formatToVND } from '../../../../utils/formatPrice'
import { useEffect } from 'react'
import logger from '../../../../utils/logger'
import { useI18n } from '../../../../i18n/useI18n'

export default function PaymentStatus() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')?.trim()?.toLowerCase()
  const type = searchParams.get('type')?.trim()?.toLowerCase()
  const txnRef = searchParams.get('txnRef')
  logger.debug('Payment status params:', { status, type, txnRef })

  const navigate = useNavigate()
  const { t } = useI18n()

  const txnQuery = useQuery({
    queryKey: ['deposit-history', txnRef],
    queryFn: () => groupApi.getDepositHistoryForGroup(txnRef || '')
  })
  logger.debug('Transaction query data:', txnQuery?.data?.data)

  useEffect(() => {
    const data = txnQuery.data?.data
    logger.debug('Transaction data:', data)

    if (!data) return

    const groupId = data?.groupId
    if (!groupId) return

    if (status === 'fail' && type === 'fund') {
      logger.debug('Navigating to fund ownership page')
      navigate(`/dashboard/viewGroups/${groupId}/fund-ownership`)
    } else if (status === 'fail' && type === 'maintenance') {
      logger.debug('Navigating to group expense page')
      navigate(`/dashboard/viewGroups/${groupId}/group-expense`)
    } else if (status === 'fail') {
      navigate(`/dashboard/viewGroups/${groupId}/paymentDeposit`)
    }
  }, [txnQuery.data, status, type, navigate])

  const handleNavigate = () => {
    if (type === 'fund') {
      return navigate(`/dashboard/viewGroups/${txnData?.groupId}/fund-ownership`)
    } else if (type === 'maintenance') {
      return navigate(`/dashboard/viewGroups/${txnData?.groupId}/group-expense`)
    } else {
      return navigate(`/dashboard/viewGroups/${txnData?.groupId}/paymentDeposit`)
    }
  }

  const txnData = txnQuery.data?.data
  const formattedAmount = formatToVND(txnData?.amount || 0)
  const formattedDate = new Date(txnData?.paidAt || '').toLocaleString('vi-VN')
  return (
    <div className='bg-white bg-opacity-90 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-md text-center'>
      {searchParams.get('status') === 'success' ? (
        <>
          <div className='flex justify-center mb-4'>
            <div className='bg-green-100 text-green-600 rounded-full p-4 text-5xl'>✔</div>
          </div>
          <h1 className='text-2xl font-bold text-gray-800 mb-2'>{t('gp_payment_success_title')}</h1>
          <p className='text-gray-600 mb-6'>
            {t('gp_payment_success_desc')}{' '}
            <span className='font-semibold'>{txnData?.paymentMethod}</span>.
          </p>

          <div className='text-left text-gray-700 space-y-2 border-t border-gray-200 pt-4'>
            <p>
              <strong>{t('gp_payment_amount')}:</strong> {formattedAmount}
            </p>
            <p>
              <strong>{t('gp_payment_method')}:</strong> {txnData?.paymentMethod}
            </p>
            <p>
              <strong>{t('gp_payment_txn_code')}:</strong> {txnData?.transactionCode}
            </p>
            <p>
              <strong>{t('gp_payment_date')}:</strong> {formattedDate}
            </p>
            <p>
              <strong>{t('gp_payment_group')}:</strong> #{txnData?.groupId}
            </p>

            <p>
              <strong>{t('gp_payment_notes')}:</strong> {t('gp_payment_notes_text')}
            </p>
          </div>

          <div className='mt-8 flex flex-col gap-3'>
            <button
              onClick={handleNavigate}
              className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition'
            >
              {t('gp_payment_close_button')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
