import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Input, Select } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import staffApi from '../../../../apis/staff.api'
import type { groupStaffItem } from '../../../../types/api/staff.type'
import PaginationButton from './components/PaginationButton'
import PropupImage from './components/PopupImage'
import StatusBadge from './components/StatusBadge'
import Skeleton from '../../../../components/Skeleton'
import EmptyState from '../EmptyState'
import { InfoCircleOutlined, RightOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons'

const { Option } = Select

export default function CheckGroup() {
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10 // fixed page size
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [selectedGroup, setSelectedGroup] = useState<groupStaffItem | null>(null)

  const groupListQuery = useQuery({
    queryKey: ['groupList', { page: currentPage, size: pageSize }],
    // keep previous page data while fetching the next one
    queryFn: () => staffApi.getAllGroupStaff(currentPage, pageSize)
  })

  const { isPending } = groupListQuery

  const allGroupData: groupStaffItem[] = groupListQuery.data?.data?.content || []

  // Filter and search logic
  const filteredGroups = useMemo(() => {
    let filtered = allGroupData

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((group) => group.status === statusFilter)
    }

    // Search by name, description, or ID
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (group) =>
          group.groupName.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower) ||
          group.groupId.toString().includes(searchTerm)
      )
    }

    return filtered
  }, [allGroupData, statusFilter, searchTerm])

  // Pagination for filtered results
  const totalFiltered = filteredGroups.length
  const startIndex = currentPage * pageSize
  const endIndex = startIndex + pageSize
  const groupData = filteredGroups.slice(startIndex, endIndex)
  const totalPages = Math.ceil(totalFiltered / pageSize)
  const pageNumber = currentPage

  // Reset to first page when filter/search changes
  const handleFilterChange = () => {
    setCurrentPage(0)
  }

  // handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage - 1) // Convert to 0-based
  }

  if (isPending) {
    return <Skeleton />
  }

  if (allGroupData.length === 0) {
    return <EmptyState />
  }

  return isPending ? (
    <Skeleton />
  ) : (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6'>
      <div className='max-w-6xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Group Approval</h1>
          <p className='text-gray-600'>Choose a group from the list below to view detailed information</p>
        </div>

        {/* Search and Filter Section */}
        <div className='bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6'>
          <div className='mb-4 flex flex-col sm:flex-row gap-4'>
            <Input
              placeholder='Search by group name, description, or ID...'
              prefix={<SearchOutlined className='text-gray-400' />}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                handleFilterChange()
              }}
              allowClear
              className='flex-1'
              size='large'
            />
            <Select
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                handleFilterChange()
              }}
              className='w-full sm:w-48'
              size='large'
            >
              <Option value='ALL'>All Status</Option>
              <Option value='PENDING'>Pending</Option>
              <Option value='ACTIVE'>Active</Option>
              <Option value='INACTIVE'>Inactive</Option>
            </Select>
          </div>

          {/* Results count */}
          <div className='text-sm text-gray-600'>
            Showing {groupData.length} of {totalFiltered} groups
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}
          </div>
        </div>

        {/* Groups List */}
        <div className='bg-white p-6 rounded-xl shadow-lg border border-gray-200'>
          <h2 className='text-xl font-semibold mb-6 border-b pb-3 text-gray-800'>
            {statusFilter === 'ALL' ? 'All groups' : `${statusFilter} groups`}
          </h2>
          {groupData.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>
              {searchTerm || statusFilter !== 'ALL' ? 'No groups match your filters' : 'No groups found'}
            </div>
          ) : (
            <div className='divide-y divide-gray-100'>
              {groupData.map((group, index) => (
                <div
                  key={group.groupId}
                  onClick={() => {
                    setSelectedGroup(group)
                  }}
                  className='group p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 cursor-pointer border-l-4 border-transparent hover:border-blue-500'
                >
                  <div className='flex items-center justify-between gap-4'>
                    {/* Left Section - Group Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-3 mb-3'>
                        <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md'>
                          {index + 1 + pageNumber * pageSize}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-1'>
                            <h3 className='text-lg font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors'>
                              {group.groupName}
                            </h3>
                            <span className='text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded'>ID: #{group.groupId}</span>
                          </div>
                        </div>
                      </div>

                      {/* Description & Capacity */}
                      <div className='ml-13 space-y-1.5'>
                        <div className='flex items-center gap-2 text-sm text-gray-600'>
                          <InfoCircleOutlined className='text-gray-400' />
                          <span className='truncate'>
                            <span className='text-gray-500 font-medium'>Description:</span>{' '}
                            <span className='text-gray-700'>{group.description || 'No description'}</span>
                          </span>
                        </div>
                        <div className='flex items-center gap-4 text-sm flex-wrap'>
                          <div className='flex items-center gap-2'>
                            <TeamOutlined className='text-indigo-600' />
                            <span className='font-medium text-indigo-600'>
                              Capacity: <span className='font-bold'>{group.memberCapacity}</span> members
                            </span>
                          </div>
                          {group.createdAt && (
                            <div className='flex items-center gap-2 text-gray-500'>
                              <CalendarOutlined className='text-gray-400' />
                              <span>
                                Created: <span className='font-medium'>{new Date(group.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Status & Action */}
                    <div className='flex items-center gap-4 flex-shrink-0'>
                      <StatusBadge status={group.status} />
                      <div className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md group-hover:bg-blue-700 group-hover:shadow-lg transform group-hover:scale-105 transition-all duration-200'>
                        <span className='text-sm'>View details</span>
                        <RightOutlined className='text-xs' />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {totalPages > 1 && (
            <div className='mt-6 pt-4 border-t flex flex-col items-center'>
              <PaginationButton currentPage={pageNumber + 1} totalPages={totalPages} onPageChange={handlePageChange} />
              <div className='text-sm text-gray-500 mt-2'>
                Page {pageNumber + 1} / {totalPages} (Total {totalFiltered} items)
              </div>
            </div>
          )}
      </div>

      {selectedGroup && <PropupImage group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
    </div>
  )
}
