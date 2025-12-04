import { Button, Card, Descriptions, Form, Select, Space, Tag } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import disputeApi from '../../../../apis/dispute.api'
import { useI18n } from '../../../../i18n/useI18n'


const DisputeDetail = () => {
  const { t } = useI18n()
  const { disputeId } = useParams<{ disputeId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [statusForm] = Form.useForm()

  const statusOptions = useMemo(
    () => [
      { label: t('admin_disputes_status_open'), value: 'OPEN' },
      { label: t('admin_disputes_status_in_review'), value: 'IN_REVIEW' },
      { label: t('admin_disputes_status_resolved'), value: 'RESOLVED' },
      { label: t('admin_disputes_status_rejected'), value: 'REJECTED' }
    ],
    [t]
  )

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['dispute-detail', disputeId],
    queryFn: () => disputeApi.detail(disputeId as string),
    enabled: !!disputeId,
    retry: 1
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => disputeApi.updateStatus(disputeId as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] })
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
    }
  })

  // Note: Comments API is not available in backend yet
  // const addCommentMutation = useMutation({
  //   mutationFn: (values: { visibility: string; content: string }) =>
  //     disputeApi.addComment(disputeId as string, values),
  //   onSuccess: () => {
  //     commentForm.resetFields()
  //     queryClient.invalidateQueries({ queryKey: ['dispute-detail', disputeId] })
  //   }
  // })

  if (!disputeId) {
    return (
      <div className='p-6'>
        <div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-center'>
          <p className='text-lg font-semibold text-red-700'>{t('admin_dispute_detail_invalid_id')}</p>
          <Button type='link' onClick={() => navigate(-1)} className='mt-4'>
            ← {t('admin_dispute_detail_back_to_disputes')}
          </Button>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='p-6'>
        <div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-center'>
          <p className='text-lg font-semibold text-red-700'>{t('admin_dispute_detail_not_found')}</p>
          <p className='mt-2 text-sm text-red-600'>
            {t('admin_dispute_detail_not_found_desc', { disputeId })}
          </p>
          <Button type='link' onClick={() => navigate(-1)} className='mt-4'>
            ← {t('admin_dispute_detail_back_to_disputes')}
          </Button>
        </div>
      </div>
    )
  }

  const detail = data?.data

  useEffect(() => {
    if (detail) {
      statusForm.setFieldsValue({
        status: detail.status
      })
    }
  }, [detail, statusForm])

  return (
    <div className='p-6 space-y-4'>
      <Button type='link' onClick={() => navigate(-1)}>
        ← {t('admin_dispute_detail_back')}
      </Button>

      <Card loading={isLoading} title={t('admin_dispute_detail_title', { disputeId })} className='rounded-2xl shadow-lg'>
        {detail && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('admin_dispute_detail_label_title')} span={2}>
              {detail.title}
            </Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_status')}>
              <Tag color='cyan'>{t(`admin_disputes_status_${detail.status.toLowerCase()}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_type')}>{detail.type}</Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_group')}>{detail.groupName}</Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_reporter')}>
              {detail.reporter?.fullName || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_resolved_by')}>
              {detail.assignedStaff?.fullName || t('admin_dispute_detail_unassigned')}
            </Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_description')} span={2}>
              {detail.description || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('admin_dispute_detail_label_resolution_note')} span={2}>
              {detail.resolutionNote || '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title={t('admin_dispute_detail_update_status_title')} className='rounded-2xl shadow-lg'>
        <Form
          layout='vertical'
          form={statusForm}
          onFinish={(values) => {
            if (values.status) {
              updateStatusMutation.mutate(values.status)
            }
          }}
          initialValues={{ status: detail?.status }}
        >
          <Form.Item
            label={t('admin_dispute_detail_label_status')}
            name='status'
            rules={[{ required: true, message: t('admin_dispute_detail_status_required') }]}
          >
            <Select options={statusOptions} />
          </Form.Item>
          <Space>
            <Button type='primary' htmlType='submit' loading={updateStatusMutation.isPending}>
              {t('admin_dispute_detail_update_status_button')}
            </Button>
          </Space>
        </Form>
        <div className='mt-4 p-3 bg-blue-50 rounded-lg'>
          <p className='text-sm text-blue-700'>
            <strong>{t('admin_dispute_detail_note')}:</strong> {t('admin_dispute_detail_note_text')}
          </p>
        </div>
      </Card>

      {/* Comments section removed - backend doesn't support comments yet */}
      {/* <Card title='Comments' className='rounded-2xl shadow-lg'>
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
      </Card> */}
    </div>
  )
}

export default DisputeDetail

