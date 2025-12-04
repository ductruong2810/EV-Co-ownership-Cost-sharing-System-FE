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
import { useI18n } from '../../../../i18n/useI18n'

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
  const { t } = useI18n()
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
      title: t('admin_audit_logs_column_timestamp'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => {
        return dayjs(timestamp).format('DD/MM/YYYY HH:mm:ss')
      },
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
    },
    {
      title: t('admin_audit_logs_column_user'),
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
      title: t('admin_audit_logs_column_action'),
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
        { text: t('admin_audit_logs_action_approve'), value: 'APPROVE' },
        { text: t('admin_audit_logs_action_reject'), value: 'REJECT' },
        { text: t('admin_audit_logs_action_create'), value: 'CREATE' },
        { text: t('admin_audit_logs_action_update'), value: 'UPDATE' },
        { text: t('admin_audit_logs_action_review'), value: 'REVIEW' }
      ],
      onFilter: (value, record) => record.actionType === value
    },
    {
      title: t('admin_audit_logs_column_entity'),
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
      title: t('admin_audit_logs_column_message'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => <Text className='text-gray-700'>{message}</Text>
    }
  ]

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow={t('admin_nav_section_system_audit')}
        title={t('admin_audit_logs_title')}
        subtitle={t('admin_audit_logs_subtitle')}
        rightSlot={<HistoryOutlined className='text-2xl text-indigo-600' />}
      />

        {/* Info Alert */}
        <Alert
          message={t('admin_audit_logs_alert_title')}
          description={t('admin_audit_logs_alert_description')}
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_audit_logs_filter_search')}</label>
                <Input
                  placeholder={t('admin_audit_logs_search_placeholder')}
                  prefix={<SearchOutlined className='text-gray-400' />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </div>
              <div className='w-[180px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_audit_logs_filter_action_type')}</label>
                <Select
                  value={actionTypeFilter}
                  onChange={setActionTypeFilter}
                  className='w-full'
                  placeholder={t('admin_audit_logs_all_actions')}
                >
                  <Option value='ALL'>{t('admin_audit_logs_all_actions')}</Option>
                  <Option value='APPROVE'>{t('admin_audit_logs_action_approve')}</Option>
                  <Option value='REJECT'>{t('admin_audit_logs_action_reject')}</Option>
                  <Option value='CREATE'>{t('admin_audit_logs_action_create')}</Option>
                  <Option value='UPDATE'>{t('admin_audit_logs_action_update')}</Option>
                  <Option value='REVIEW'>{t('admin_audit_logs_action_review')}</Option>
                </Select>
              </div>
              <div className='w-[180px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_audit_logs_filter_entity_type')}</label>
                <Select
                  value={entityTypeFilter}
                  onChange={setEntityTypeFilter}
                  className='w-full'
                  placeholder={t('admin_audit_logs_all_entities')}
                >
                  <Option value='ALL'>{t('admin_audit_logs_all_entities')}</Option>
                  <Option value='DOCUMENT'>{t('admin_audit_logs_entity_document')}</Option>
                  <Option value='MAINTENANCE'>{t('admin_audit_logs_entity_maintenance')}</Option>
                  <Option value='VEHICLE_CHECK'>{t('admin_audit_logs_entity_vehicle_check')}</Option>
                  <Option value='GROUP'>{t('admin_audit_logs_entity_group')}</Option>
                  <Option value='CONTRACT'>{t('admin_audit_logs_entity_contract')}</Option>
                </Select>
              </div>
              <div className='w-[320px]'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>{t('admin_audit_logs_filter_date_range')}</label>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                  format='DD/MM/YYYY'
                  className='w-full'
                  placeholder={[t('admin_dashboard_range_from_date_placeholder'), t('admin_dashboard_range_to_date_placeholder')]}
                />
              </div>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                {t('admin_audit_logs_refresh')}
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
              message={t('admin_audit_logs_error_load')}
              description={t('admin_audit_logs_error_description')}
              type='error'
              showIcon
              className='m-6'
              action={
                <Button size='small' onClick={() => refetch()}>
                  {t('admin_dashboard_retry')}
                </Button>
              }
            />
          ) : filteredLogs.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-gray-400'>
              <HistoryOutlined className='text-5xl mb-4 opacity-50' />
              <p className='text-lg font-medium'>{t('admin_audit_logs_empty_title')}</p>
              <p className='text-sm mt-1'>
                {searchTerm || actionTypeFilter !== 'ALL' || entityTypeFilter !== 'ALL' || dateRange[0]
                  ? t('admin_audit_logs_empty_try_filters')
                  : t('admin_audit_logs_empty_backend_not_implemented')}
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
                showTotal: (total) => t('admin_audit_logs_pagination_total', { total }),
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

