import { useQuery } from '@tanstack/react-query'
import { Card, Table, DatePicker, Select, Input, Space, Button, Tag, Typography, Alert, Spin } from 'antd'
import {
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import auditApi from '../../../../apis/audit.api'
import type { ColumnsType } from 'antd/es/table'
import AdminPageContainer from '../../AdminPageContainer'
import AdminPageHeader from '../../AdminPageHeader'

const { RangePicker } = DatePicker
const { Option } = Select
const { Title, Text } = Typography

// TODO: Update this type when BE provides GET endpoint
export interface AuditLog {
  id: string
  timestamp: string
  userId: number
  userName: string
  userRole: string
  actionType: string
  entityType?: string
  entityId?: string | number
  message: string
  metadata?: Record<string, unknown>
}

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('ALL')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // TODO: Backend needs to implement GET /api/audit/logs endpoint
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['auditLogs', page, pageSize, searchTerm, actionTypeFilter, entityTypeFilter, dateRange],
    queryFn: async () => {
      try {
        const response = await auditApi.getAuditLogs({
          page,
          size: pageSize,
          actionType: actionTypeFilter !== 'ALL' ? actionTypeFilter : undefined,
          entityType: entityTypeFilter !== 'ALL' ? entityTypeFilter : undefined,
          from: dateRange[0]?.toISOString(),
          to: dateRange[1]?.toISOString(),
          search: searchTerm || undefined
        })
        return response.data
      } catch (err: any) {
        // If endpoint not implemented (404), return empty data
        if (err?.response?.status === 404) {
          return {
            logs: [] as AuditLog[],
            total: 0,
            page,
            pageSize
          }
        }
        throw err
      }
    },
    retry: 1
  })

  const logs = data?.logs || []
  const total = data?.total || 0

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => {
        return dayjs(timestamp).format('DD/MM/YYYY HH:mm:ss')
      },
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
    },
    {
      title: 'User',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (userName: string, record: AuditLog) => (
        <div className='flex items-center gap-2'>
          <UserOutlined className='text-gray-400' />
          <div>
            <div className='font-medium text-gray-900'>{userName}</div>
            <div className='text-xs text-gray-500'>{record.userRole}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Action',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 180,
      render: (actionType: string) => {
        const colorMap: Record<string, string> = {
          APPROVE: 'green',
          REJECT: 'red',
          CREATE: 'blue',
          UPDATE: 'orange',
          DELETE: 'red',
          REVIEW: 'purple'
        }
        const color = colorMap[actionType] || 'default'
        return <Tag color={color}>{actionType}</Tag>
      },
      filters: [
        { text: 'APPROVE', value: 'APPROVE' },
        { text: 'REJECT', value: 'REJECT' },
        { text: 'CREATE', value: 'CREATE' },
        { text: 'UPDATE', value: 'UPDATE' },
        { text: 'REVIEW', value: 'REVIEW' }
      ],
      onFilter: (value, record) => record.actionType === value
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 150,
      render: (_, record: AuditLog) => {
        if (!record.entityType) return '-'
        return (
          <div className='flex items-center gap-1'>
            <FileTextOutlined className='text-gray-400' />
            <span className='text-sm'>
              {record.entityType}
              {record.entityId && ` #${record.entityId}`}
            </span>
          </div>
        )
      }
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => <Text className='text-gray-700'>{message}</Text>
    }
  ]

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow='System & Audit'
        title='Audit Logs'
        subtitle='View system activity and user actions history'
        rightSlot={<HistoryOutlined className='text-2xl text-indigo-600' />}
      />

        {/* Info Alert */}
        <Alert
          message='Audit Log Viewer'
          description='This page displays all system activities and user actions. The backend endpoint GET /api/audit/logs needs to be implemented to fetch actual data.'
          type='info'
          showIcon
          closable
          className='mb-6'
        />

        {/* Filters */}
        <Card className='mb-6 shadow-sm' styles={{ body: { padding: '20px' } }}>
          <Space direction='vertical' size='middle' className='w-full'>
            <div className='flex flex-wrap gap-3 items-end'>
              <div className='flex-1 min-w-[200px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Search</label>
                <Input
                  placeholder='Search by message, user, or action...'
                  prefix={<SearchOutlined className='text-gray-400' />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </div>
              <div className='w-[180px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Action Type</label>
                <Select
                  value={actionTypeFilter}
                  onChange={setActionTypeFilter}
                  className='w-full'
                  placeholder='All actions'
                >
                  <Option value='ALL'>All Actions</Option>
                  <Option value='APPROVE'>Approve</Option>
                  <Option value='REJECT'>Reject</Option>
                  <Option value='CREATE'>Create</Option>
                  <Option value='UPDATE'>Update</Option>
                  <Option value='REVIEW'>Review</Option>
                </Select>
              </div>
              <div className='w-[180px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Entity Type</label>
                <Select
                  value={entityTypeFilter}
                  onChange={setEntityTypeFilter}
                  className='w-full'
                  placeholder='All entities'
                >
                  <Option value='ALL'>All Entities</Option>
                  <Option value='DOCUMENT'>Document</Option>
                  <Option value='MAINTENANCE'>Maintenance</Option>
                  <Option value='VEHICLE_CHECK'>Vehicle Check</Option>
                  <Option value='GROUP'>Group</Option>
                  <Option value='CONTRACT'>Contract</Option>
                </Select>
              </div>
              <div className='w-[320px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Date Range</label>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                  format='DD/MM/YYYY'
                  className='w-full'
                  placeholder={['From date', 'To date']}
                />
              </div>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </Space>
        </Card>

        {/* Table */}
        <Card className='shadow-sm' styles={{ body: { padding: 0 } }}>
          {isLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Spin size='large' />
            </div>
          ) : error ? (
            <Alert
              message='Failed to load audit logs'
              description='Please try again later or contact support if the issue persists.'
              type='error'
              showIcon
              className='m-6'
              action={
                <Button size='small' onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          ) : filteredLogs.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-gray-400'>
              <HistoryOutlined className='text-5xl mb-4 opacity-50' />
              <p className='text-lg font-medium'>No audit logs found</p>
              <p className='text-sm mt-1'>
                {searchTerm || actionTypeFilter !== 'ALL' || entityTypeFilter !== 'ALL' || dateRange[0]
                  ? 'Try adjusting your filters'
                  : 'Audit logs will appear here once the backend endpoint is implemented'}
              </p>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredLogs}
              rowKey='id'
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} logs`,
                onChange: (newPage, newPageSize) => {
                  setPage(newPage)
                  setPageSize(newPageSize)
                }
              }}
              scroll={{ x: 1000 }}
            />
          )}
        </Card>
    </AdminPageContainer>
  )
}

export default AuditLogs

