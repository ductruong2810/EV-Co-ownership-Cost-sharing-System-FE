import { Button, Card, Descriptions, Form, Input, Select, Space, Tag } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import disputeApi from '../../../../apis/dispute.api'
import type { DisputeComment } from '../../../../types/api/dispute.type'

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In review', value: 'IN_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const visibilityOptions = [
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Internal', value: 'INTERNAL' }
]

const DisputeDetail = () => {
  const { disputeId } = useParams<{ disputeId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [statusForm] = Form.useForm()
  const [commentForm] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['dispute-detail', disputeId],
    queryFn: () => disputeApi.detail(disputeId as string),
    enabled: !!disputeId
  })

  const updateStatusMutation = useMutation({
    mutationFn: (values: { status?: string; resolutionNote?: string }) =>
      disputeApi.updateStatus(disputeId as string, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] })
    }
  })

  const addCommentMutation = useMutation({
    mutationFn: (values: { visibility: string; content: string }) =>
      disputeApi.addComment(disputeId as string, values),
    onSuccess: () => {
      commentForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] })
    }
  })

  if (!disputeId) {
    return <div>Invalid dispute id</div>
  }

  const detail = data?.data

  useEffect(() => {
    if (detail) {
      statusForm.setFieldsValue({
        status: detail.status,
        resolutionNote: detail.resolutionNote
      })
    }
  }, [detail, statusForm])

  return (
    <div className='p-6 space-y-4'>
      <Button type='link' onClick={() => navigate(-1)}>
        ← Back
      </Button>

      <Card loading={isLoading} title={`Dispute #${disputeId}`} className='rounded-2xl shadow-lg'>
        {detail && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label='Title' span={2}>
              {detail.title}
            </Descriptions.Item>
            <Descriptions.Item label='Status'>
              <Tag color='cyan'>{detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label='Type'>{detail.type}</Descriptions.Item>
            <Descriptions.Item label='Group'>{detail.groupName}</Descriptions.Item>
            <Descriptions.Item label='Vehicle'>{detail.vehicleInfo || '—'}</Descriptions.Item>
            <Descriptions.Item label='Reporter'>{detail.reporter?.fullName}</Descriptions.Item>
            <Descriptions.Item label='Target'>{detail.targetUser?.fullName || '—'}</Descriptions.Item>
            <Descriptions.Item label='Assigned to'>{detail.assignedStaff?.fullName || 'Unassigned'}</Descriptions.Item>
            <Descriptions.Item label='Description' span={2}>
              {detail.description || '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Evidence' span={2}>
              {detail.evidenceUrls || '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Resolution note' span={2}>
              {detail.resolutionNote || '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title='Update status' className='rounded-2xl shadow-lg'>
        <Form
          layout='vertical'
          form={statusForm}
          onFinish={(values) => updateStatusMutation.mutate(values)}
          initialValues={{ status: detail?.status }}
        >
          <Form.Item label='Status' name='status'>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label='Resolution note' name='resolutionNote'>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button type='primary' htmlType='submit' loading={updateStatusMutation.isPending}>
              Save
            </Button>
          </Space>
        </Form>
      </Card>

      <Card title='Comments' className='rounded-2xl shadow-lg'>
        <div className='space-y-3 mb-6'>
          {detail?.comments?.length ? (
            detail.comments.map((comment: DisputeComment) => (
              <div key={comment.commentId} className='border border-slate-100 rounded-xl p-3 bg-slate-50'>
                <div className='flex items-center justify-between text-sm mb-1'>
                  <span className='font-semibold text-slate-700'>{comment.author?.fullName || 'System'}</span>
                  <span className='text-xs text-slate-400'>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className='text-slate-700 text-sm'>{comment.content}</p>
                <Tag size='small' className='mt-2'>
                  {comment.visibility}
                </Tag>
              </div>
            ))
          ) : (
            <p className='text-sm text-slate-500'>No comments yet</p>
          )}
        </div>

        <Form layout='vertical' form={commentForm} onFinish={(values) => addCommentMutation.mutate(values)}>
          <Form.Item label='Visibility' name='visibility' initialValue='PUBLIC'>
            <Select options={visibilityOptions} />
          </Form.Item>
          <Form.Item label='Comment' name='content' rules={[{ required: true, message: 'Please enter comment' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type='primary' htmlType='submit' loading={addCommentMutation.isPending}>
            Add comment
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default DisputeDetail

