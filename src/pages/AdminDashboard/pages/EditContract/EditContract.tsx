import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Input, Select, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import adminApi from '../../../../apis/admin.api'
import logger from '../../../../utils/logger'
import AdminPageContainer from '../../AdminPageContainer'
import AdminPageHeader from '../../AdminPageHeader'
import { useI18n } from '../../../../i18n/useI18n'

const { Option } = Select

export default function EditContract() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const allContractQuery = useQuery({
    queryKey: ['all-contracts-for-edit'],
    queryFn: () => adminApi.getContractsForEdit()
  })

  const allContracts = allContractQuery?.data?.data || []
  logger.debug('Contracts for edit:', allContracts)

  const contracts = useMemo(() => {
    let filtered = allContracts.filter(
      (contract: any) => contract?.approvalStatus === 'SIGNED' || contract?.approvalStatus === 'PENDING'
    )

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (contract: any) =>
          contract.id.toString().includes(searchTerm) ||
          contract.groupId.toString().includes(searchTerm) ||
          contract.groupName?.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((contract: any) => contract.approvalStatus === statusFilter)
    }

    return filtered
  }, [allContracts, searchTerm, statusFilter])

  const handleViewFeedback = ({
    contractId,
    groupId,
    groupName
  }: {
    contractId: string
    groupId: string
    groupName: string
  }) => {
    navigate(`/manager/feedbackCo-Owner/${contractId}/${groupId}/${groupName}`)
  }


  if (allContractQuery?.data?.data.length === 0)
    return (
      <AdminPageContainer>
        <AdminPageHeader
          eyebrow={t('admin_nav_section_contracts_team')}
          title={t('admin_edit_contract_title')}
          subtitle={t('admin_edit_contract_subtitle')}
        />
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center'>
          <h2 className='text-2xl font-semibold text-gray-700 mb-2'>{t('admin_edit_contract_empty_title')}</h2>
          <p className='text-gray-500'>{t('admin_edit_contract_empty_desc')}</p>
        </div>
      </AdminPageContainer>
    )

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow={t('admin_nav_section_contracts_team')}
        title={t('admin_edit_contract_title')}
        subtitle={t('admin_edit_contract_subtitle')}
      />

      {/* Loading State */}
      {allContractQuery.isLoading && (
        <div className='mb-6 flex items-center justify-center py-8 bg-white rounded-xl shadow-sm border border-gray-100'>
          <Spin size='large' />
          <span className='ml-3 text-gray-600 font-medium'>{t('admin_edit_contract_loading')}</span>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className='mb-6 flex flex-col sm:flex-row gap-4'>
        <Input
          placeholder={t('admin_edit_contract_search_placeholder')}
          prefix={<SearchOutlined className='text-gray-400' />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          className='flex-1'
          size='large'
        />
        <Select value={statusFilter} onChange={setStatusFilter} className='w-full sm:w-48' size='large'>
          <Option value='ALL'>{t('admin_edit_contract_status_all')}</Option>
          <Option value='SIGNED'>{t('admin_edit_contract_status_signed')}</Option>
          <Option value='PENDING'>{t('admin_edit_contract_status_pending')}</Option>
        </Select>
      </div>

      {/* Results count */}
      {contracts.length !==
        allContracts.filter((c: any) => c?.approvalStatus === 'SIGNED' || c?.approvalStatus === 'PENDING').length && (
        <div className='mb-4 text-sm text-gray-600'>
          {t('admin_edit_contract_showing', {
            showing: contracts.length,
            total: allContracts.filter((c: any) => c?.approvalStatus === 'SIGNED' || c?.approvalStatus === 'PENDING').length,
            searchTerm: searchTerm ? ` "${searchTerm}"` : '',
            status: statusFilter !== 'ALL' ? ` "${statusFilter}"` : ''
          })}
        </div>
      )}

      {contracts.length === 0 ? (
        <div className='bg-white rounded-xl shadow-lg p-8 text-center'>
          <h2 className='text-xl font-semibold text-gray-700'>{t('admin_edit_contract_no_available')}</h2>
        </div>
      ) : (
        <div className='bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-100'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_id')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_group_name')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_start_date')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_end_date')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_duration')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_status')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_created')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    {t('admin_edit_contract_table_actions')}
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className='px-6 py-12 text-center text-gray-500'>
                      {searchTerm || statusFilter !== 'ALL' ? t('admin_edit_contract_no_match') : t('admin_edit_contract_no_contracts')}
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract: any) => (
                    <tr key={contract.id} className='hover:bg-gray-50 transition-colors'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>#{contract.id}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>{contract.groupName}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                        {new Date(contract.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                        {new Date(contract.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                        {Math.ceil(
                          (new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        {t('admin_edit_contract_days')}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contract.approvalStatus === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : contract.approvalStatus === 'SIGNED'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {contract.approvalStatus === 'APPROVED' ? t('admin_edit_contract_status_approved') : contract.approvalStatus === 'SIGNED' ? t('admin_edit_contract_status_signed') : t('admin_edit_contract_status_rejected')}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {contract.createdAt
                          ? new Date(contract.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm'>
                        <div className='flex justify-end gap-2'>
                          <button
                            className='px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors'
                            onClick={() =>
                              handleViewFeedback({
                                contractId: contract.id.toString(),
                                groupId: contract.groupId.toString(),
                                groupName: contract.groupName.toString()
                              })
                            }
                          >
                            {t('admin_edit_contract_view_feedback')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageContainer>
  )
}