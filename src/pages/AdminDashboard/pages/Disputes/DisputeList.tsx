import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import disputeApi from '../../../../apis/dispute.api'
import type { DisputeSummary } from '../../../../types/api/dispute.type'

const statusColors: Record<string, string> = {
  OPEN: 'orange',
  IN_REVIEW: 'blue',
  RESOLVED: 'green',
  REJECTED: 'red'
}

const DisputeList = () => {
  const [status, setStatus] = useState<string | undefined>('OPEN')
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['disputes', status],
    queryFn: () => disputeApi.list({ status, page: 0, size: 50 })
  })

  const columns: ColumnsType<DisputeSummary> = useMemo(
    () => [
      { title: 'ID', dataIndex: 'disputeId', width: 80 },
      {
        title: 'Title',
        dataIndex: 'title',
        render: (value, record) => (
          <div className='font-semibold text-slate-800 cursor-pointer hover:text-cyan-600' onClick={() => handleRow(record)}>
            {value}
          </div>
        )
      },
      {
        title: 'Type',
        dataIndex: 'type',
        width: 120
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (value: string) => <Tag color={statusColors[value] || 'default'}>{value}</Tag>
      },
      {
        title: 'Reporter',
        dataIndex: 'reporterName',
        width: 160
      },
      {
        title: 'Group',
        dataIndex: 'groupName',
        width: 160
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString()
      }
    ],
    []
  )

  const handleRow = (record: DisputeSummary) => {
    navigate(`disputes/${record.disputeId}`)
  }

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Dispute Center</h1>
          <p className='text-slate-500 text-sm'>Theo dõi và xử lý tranh chấp của các nhóm</p>
        </div>
        <Select
          value={status}
          onChange={(value) => setStatus(value)}
          allowClear
          placeholder='Filter by status'
          style={{ width: 180 }}
          options={[
            { label: 'Open', value: 'OPEN' },
            { label: 'In review', value: 'IN_REVIEW' },
            { label: 'Resolved', value: 'RESOLVED' },
            { label: 'Rejected', value: 'REJECTED' }
          ]}
        />
      </div>

      <Table
        rowKey='disputeId'
        columns={columns}
        dataSource={data?.data.content || []}
        loading={isLoading}
        pagination={false}
        onRow={(record) => ({
          onClick: () => handleRow(record)
        })}
        className='rounded-2xl border border-slate-100 shadow-lg'
      />
    </div>
  )
}

export default DisputeList

