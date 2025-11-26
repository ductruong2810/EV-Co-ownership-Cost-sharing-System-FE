import { CheckCircleOutlined, ExclamationCircleOutlined, UserOutlined } from '@ant-design/icons'
import type { FeedbackCoOwnerResponse } from '../../../../../../../types/api/admin.type'

export default function MainContent({ feedBacks }: { feedBacks: FeedbackCoOwnerResponse }) {
  // Calculate unique users who sent feedback
  const uniqueUsersCount = feedBacks?.feedbacks
    ? new Set(feedBacks.feedbacks.map((f) => f.email)).size
    : 0

  return (
    <div className='max-w-7xl mx-auto px-6 py-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        {/* Total Members Card */}
        <div className='bg-white rounded-xl shadow-lg border-l-4 border-l-blue-500 hover:shadow-xl transition-shadow duration-300 p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-gray-600 mb-2'>Total Members with Feedback</p>
              <p className='text-3xl font-bold text-gray-900'>{uniqueUsersCount}</p>
            </div>
            <div className='w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
              <UserOutlined className='text-2xl text-blue-600' />
            </div>
          </div>
        </div>

        {/* Total Feedback Card */}
        <div className='bg-white rounded-xl shadow-lg border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow duration-300 p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-gray-600 mb-2'>Total Feedback</p>
              <p className='text-3xl font-bold text-gray-900'>{feedBacks?.totalFeedbacks ?? 0}</p>
            </div>
            <div className='w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0'>
              <ExclamationCircleOutlined className='text-2xl text-purple-600' />
            </div>
          </div>
        </div>

        {/* Approved Feedback Card */}
        <div className='bg-white rounded-xl shadow-lg border-l-4 border-l-green-500 hover:shadow-xl transition-shadow duration-300 p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-gray-600 mb-2'>Approved Feedback</p>
              <p className='text-3xl font-bold text-gray-900'>{feedBacks?.approvedFeedbacksCount ?? 0}</p>
            </div>
            <div className='w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0'>
              <CheckCircleOutlined className='text-2xl text-green-600' />
            </div>
          </div>
        </div>
      </div>

      {/* Contract Status */}
      <div className='mb-6 flex items-center gap-3'>
        <span className='text-sm font-medium text-gray-600'>Contract Status:</span>
        <span className='px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200'>
          {feedBacks?.contractStatus || 'N/A'}
        </span>
      </div>
    </div>
  )
}
