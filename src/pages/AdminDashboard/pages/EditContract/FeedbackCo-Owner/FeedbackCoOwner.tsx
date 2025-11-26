import { CheckCircleOutlined, ClockCircleOutlined, LeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import adminApi from '../../../../../apis/admin.api'
import type { FeedbackItem } from '../../../../../types/api/admin.type'
import MainContent from './components/MainContent'

export default function FeedbackCoOwner() {
  const { contractId, groupName, groupId } = useParams()

  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null)

  const navigate = useNavigate()

  const feedContractQuery = useQuery({
    queryKey: ['feedback-by-contract-id', contractId],
    queryFn: () => adminApi.getFeedbackByContractId(contractId ?? ''),
    enabled: !!contractId
  })

  console.log(feedContractQuery?.data)

  const feedbacks = feedContractQuery?.data?.data

  const groupedFeedbacks = useMemo(() => {
    const allFeedbacks =
      feedbacks?.feedbacks?.filter((f) => f.reactionType === 'DISAGREE' && f.status === 'APPROVED') || []

    const grouped: Record<string, FeedbackItem[]> = {}

    allFeedbacks.forEach((feedback) => {
      if (!grouped[feedback.email]) {
        grouped[feedback.email] = []
      }
      grouped[feedback.email].push(feedback)
    })

    return grouped
  }, [feedbacks?.feedbacks])

  const users = useMemo(() => {
    return Object.keys(groupedFeedbacks).map((email) => {
      const userFeedbacks = groupedFeedbacks[email]
      const firstFeedback = userFeedbacks[0]
      return {
        email,
        fullName: firstFeedback.fullName,
        feedbackCount: userFeedbacks.length,
        groupRole: userFeedbacks[0].groupRole,
        pendingCount: userFeedbacks.filter((f) => f.status === 'PENDING' && f.reactionType === 'DISAGREE').length,
        approvedCount: userFeedbacks.filter((f) => f.status === 'APPROVED' && f.reactionType === 'DISAGREE').length,
        rejectedCount: userFeedbacks.filter((f) => f.status === 'REJECTED' && f.reactionType === 'DISAGREE').length,
        approveAgree: userFeedbacks.filter((f) => f.reactionType === 'AGREE').length
      }
    })
  }, [groupedFeedbacks])

  const selectedUserFeedbacks = useMemo(() => {
    if (!selectedUserEmail) return []
    return groupedFeedbacks[selectedUserEmail] || []
  }, [selectedUserEmail, groupedFeedbacks])

  const handleUserClick = (email: string) => {
    setSelectedUserEmail(email)
    setSelectedFeedback(null)
  }

  const handleFeedbackClick = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback)
  }

  const handleEditContract = ({ contractId, groupId }: { contractId: string; groupId: string }) => {
    if (!feedbacks?.contractId || !groupId) return
    navigate(`/manager/editContractDetail/${contractId}/${groupId}`)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-4 mb-4'>
            <button
              onClick={() => navigate('/manager/editContract')}
              className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100'
            >
              <LeftOutlined className='text-lg' />
              <span className='font-medium'>Back to Contract Editing</span>
            </button>
          </div>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Contract Feedback Management</h1>
            <p className='text-gray-600'>View and manage feedback from co-owners about the contract</p>
            <div className='mt-3 flex items-center gap-2'>
              <span className='text-sm text-gray-500'>Group:</span>
              <span className='px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium'>
                {groupName}
              </span>
              {contractId && (
                <>
                  <span className='text-gray-400'>•</span>
                  <span className='text-sm text-gray-500'>Contract ID: {contractId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {feedbacks && <MainContent feedBacks={feedbacks} />}

        {/* Content Grid */}
        <div className='py-6'>
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
          {/* Feedback List - Two Level: Users -> Feedbacks */}
          <div className='lg:col-span-3'>
            <div className='bg-white rounded-xl border border-gray-200 shadow-lg p-6'>
              {!selectedUserEmail ? (
                <>
                  {/* User List */}
                  <h2 className='text-xl font-bold text-gray-900 mb-6'>Users with Feedback</h2>
                  <div
                    className='max-h-[calc(100vh-380px)] overflow-y-auto space-y-3 pr-2 scroll-smooth
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:bg-gray-100
                    [&::-webkit-scrollbar-track]:rounded-lg
                    [&::-webkit-scrollbar-thumb]:bg-gray-300
                    [&::-webkit-scrollbar-thumb]:rounded-lg
                    [&::-webkit-scrollbar-thumb]:hover:bg-gray-400'
                  >
                    {users.length === 0 ? (
                      <div className='text-center py-12 text-gray-500'>
                        <p>No users with feedback found</p>
                      </div>
                    ) : (
                      users.map((user) => (
                        <div
                          key={user.email}
                          onClick={() => handleUserClick(user.email)}
                          className='bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 shadow-md hover:shadow-xl transition-all cursor-pointer'
                        >
                        <div className='p-5'>
                          <div className='flex items-center gap-3 mb-3'>
                            <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md'>
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className='flex-1'>
                              <h3 className='font-semibold text-gray-900 text-base'>{user.fullName}</h3>
                              <p className='text-sm text-gray-500'>{user.email}</p>
                              <p className='inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full border border-purple-200 mt-1'>
                                {user.groupRole}
                              </p>
                            </div>
                            <div className='flex items-center gap-2'>
                              <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200'>
                                {user.feedbackCount} feedback
                              </span>
                            </div>
                          </div>
                          <div className='flex items-center gap-2 text-xs'>
                            {user.approvedCount > 0 && (
                              <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200'>
                                <CheckCircleOutlined />
                                {user.approvedCount} approved
                              </span>
                            )}
                          </div>
                        </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* User's Feedbacks */}
                  <div className='flex items-center gap-3 mb-6'>
                    <button
                      onClick={() => setSelectedUserEmail(null)}
                      className='flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
                    >
                      <LeftOutlined />
                      Back
                    </button>
                    <h2 className='text-xl font-bold text-gray-900'>
                      Feedback from {selectedUserFeedbacks[0]?.fullName}
                    </h2>
                  </div>
                  <div
                    className='max-h-[calc(100vh-380px)] overflow-y-auto space-y-3 pr-2 scroll-smooth
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:bg-gray-100
                    [&::-webkit-scrollbar-track]:rounded-lg
                    [&::-webkit-scrollbar-thumb]:bg-gray-300
                    [&::-webkit-scrollbar-thumb]:rounded-lg
                    [&::-webkit-scrollbar-thumb]:hover:bg-gray-400'
                  >
                    {selectedUserFeedbacks.length === 0 ? (
                      <div className='text-center py-12 text-gray-500'>
                        <p>No feedback found for this user</p>
                      </div>
                    ) : (
                      selectedUserFeedbacks.map((feedback, index) => (
                        <div
                          key={feedback?.feedbackId + '-' + index}
                          onClick={() => handleFeedbackClick(feedback)}
                          className={`bg-white rounded-xl border-2 shadow-md hover:shadow-xl transition-all cursor-pointer ${
                            selectedFeedback?.feedbackId === feedback?.feedbackId
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-400'
                          }`}
                        >
                        <div className='p-5'>
                          <div className='flex items-start justify-between mb-3'>
                            <div className='flex items-center gap-3 flex-1'>
                              <div className='w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold'>
                                {feedback?.fullName.charAt(0).toUpperCase()}
                              </div>

                              <div className='flex-1'>
                                <h3 className='font-semibold text-gray-900 text-base'>{feedback?.fullName}</h3>
                                <p className='text-sm text-gray-500'>{feedback?.email}</p>
                              </div>

                              {feedback?.status === 'APPROVED' && feedback?.reactionType === 'DISAGREE' && (
                                <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200'>
                                  <CheckCircleOutlined className='text-sm' />
                                  Approved
                                </span>
                              )}
                            </div>
                          </div>
                          <div className='mb-3'>
                            <p className='text-sm text-gray-700 leading-relaxed line-clamp-2'>{feedback?.reason}</p>
                          </div>
                          <div className='flex items-center justify-between text-sm'>
                            <span className='text-gray-500'>
                              {new Date(feedback?.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Feedback Detail - Read Only */}
          <div className='lg:col-span-2'>
            {selectedFeedback ? (
              <div className='bg-white rounded-xl border border-gray-200 shadow-lg sticky top-24'>
                <div className='p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'>
                  <h2 className='text-xl font-bold text-gray-900'>Feedback Details</h2>
                </div>

                <div className='p-6'>
                  {/* User Info */}
                  <div className='mb-6'>
                    <div className='flex items-center gap-3 mb-3'>
                      <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md'>
                        {selectedFeedback?.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className='font-semibold text-gray-900'>{selectedFeedback?.fullName}</p>
                        <p className='text-sm text-gray-600'>{selectedFeedback?.email}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-gray-500'>
                      <ClockCircleOutlined />
                      <span>Submitted: {new Date(selectedFeedback?.submittedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className='mb-6 pb-6 border-b border-gray-100'>
                    <h3 className='font-semibold text-gray-900 mb-3'>Feedback Reason</h3>
                    <p className='text-sm text-gray-700 leading-relaxed'>{selectedFeedback?.reason}</p>
                  </div>

                  {/* Action Buttons or Admin Note Display */}
                  <div className='space-y-2.5'>
                    <>
                      <button
                        className='w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg'
                        onClick={() =>
                          handleEditContract({
                            contractId: feedbacks?.contractId.toString() as string,
                            groupId: groupId as string
                          })
                        }
                      >
                        <CheckCircleOutlined />
                        Edit Contract
                      </button>
                    </>
                  </div>
                </div>
              </div>
            ) : (
              <div className='bg-white rounded-xl border border-gray-200 shadow-lg p-8 text-center'>
                <p className='text-gray-600'>Click on a feedback to view details</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
