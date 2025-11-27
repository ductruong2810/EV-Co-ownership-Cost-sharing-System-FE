import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Input, Select } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import adminApi from '../../../../apis/admin.api'
import { useNavigate } from 'react-router-dom'
import Skeleton from '../../../../components/Skeleton'
import logger from '../../../../utils/logger'

const { Option } = Select

export default function EditContract() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const allContractQuery = useQuery({
    queryKey: ['all-contracts-for-edit'],
    queryFn: () => adminApi.getContractsForEdit()
  })

  // Sample data - replace with your API data
  const allContracts = allContractQuery?.data?.data || []
  logger.debug('Contracts for edit:', allContracts)

  // Filter and search logic
  const contracts = useMemo(() => {
    let filtered = allContracts.filter((contract: any) => contract?.approvalStatus === 'SIGNED' || contract?.approvalStatus === 'PENDING')

    // Search by ID or group name
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (contract: any) =>
          contract.id.toString().includes(searchTerm) ||
          contract.groupId.toString().includes(searchTerm) ||
          contract.groupName?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((contract: any) => contract.approvalStatus === statusFilter)
    }

    return filtered
  }, [allContracts, searchTerm, statusFilter])

  //
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

  if (allContractQuery.isLoading) return <Skeleton />
  if (allContractQuery?.data?.data.length === 0)
    return (
      <div className='min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-6'>
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center'>
          <h2 className='text-2xl font-semibold text-gray-700 mb-2'>No contracts available for editing</h2>
          <p className='text-gray-500'>There are no contracts that require editing at this time.</p>
        </div>
      </div>
    )
  return (
    <div className='min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6'>
      <div className='max-w-6xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Contract Editing</h1>
          <p className='text-gray-600'>Review and manage contract feedback</p>
        </div>

        {/* Search and Filter Section */}
        <div className='mb-6 flex flex-col sm:flex-row gap-4'>
          <Input
            placeholder='Search by contract ID, group ID, or group name...'
            prefix={<SearchOutlined className='text-gray-400' />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className='flex-1'
            size='large'
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className='w-full sm:w-48'
            size='large'
          >
            <Option value='ALL'>All Status</Option>
            <Option value='SIGNED'>Signed</Option>
            <Option value='PENDING'>Pending</Option>
          </Select>
        </div>

        {/* Results count */}
        {contracts.length !== allContracts.filter((c: any) => c?.approvalStatus === 'SIGNED' || c?.approvalStatus === 'PENDING').length && (
          <div className='mb-4 text-sm text-gray-600'>
            Showing {contracts.length} of {allContracts.filter((c: any) => c?.approvalStatus === 'SIGNED' || c?.approvalStatus === 'PENDING').length} contracts
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}
          </div>
        )}

               {contracts.length === 0 ? (
          <div className='bg-white rounded-xl shadow-lg p-8 text-center'>
            <h2 className='text-xl font-semibold text-gray-700'>No contracts available for editing.</h2>
          </div>
        ) : (
          <div className='bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-100'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Contract ID
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Group Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Start Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    End Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Duration
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Created
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className='px-6 py-12 text-center text-gray-500'>
                      {searchTerm || statusFilter !== 'ALL' ? 'No contracts match your filters' : 'No contracts found'}
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id} className='hover:bg-gray-50 transition-colors'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>#{contract.id}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>{contract.groupName}</td>
                               <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                                 {new Date(contract.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                               </td>
                               <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                                 {new Date(contract.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                               </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                        {Math.ceil(
                          (new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
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
                          {contract.approvalStatus}
                        </span>
                      </td>
                               <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                 {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
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
                            View Feedback
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
