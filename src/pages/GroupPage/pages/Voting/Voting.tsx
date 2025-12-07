/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import userApi from '../../../../apis/user.api'
import { getGroupIdFromLS } from '../../../../utils/auth'
import type { Voting, CreateVotingPayload, VotingSubmitPayload } from '../../../../types/api/user.type'
import Skeleton from '../../../../components/Skeleton'
import EmptyVoting from './components/EmptyVoting'
import { useI18n } from '../../../../i18n/useI18n'
import { showErrorToast } from '../../../../components/Error/ErrorToast'
import { ErrorType, ErrorSeverity } from '../../../../types/error.type'

export default function Voting() {
  const { t } = useI18n()
  const [showModal, setShowModal] = useState(false)
  const groupId = getGroupIdFromLS()
  const queryClient = useQueryClient()

  const { data: votes = [], isLoading } = useQuery<Voting[]>({
    queryKey: ['votings', groupId],
    queryFn: async () => (await userApi.getAllVoting(Number(groupId))).data
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateVotingPayload) => userApi.createVoting(payload),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['votings', groupId] })
      setShowModal(false)
      toast.success(t('gp_voting_toast_create_success'))
    },
    onError: (error: any) => {
      showErrorToast({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        message: error.response?.data?.message || t('gp_voting_toast_create_error'),
        timestamp: new Date()
      })
    }
  })

  if (isLoading) return <Skeleton />

  return (
    <div className='h-screen bg-gradient-to-br from-gray-50 to-gray-100 my-10 rounded-2xl p-8 flex flex-col'>
      <div className='max-w-7xl mx-auto w-full flex flex-col h-full'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8 flex-shrink-0'>
          <div>
            <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent'>
              {t('gp_voting_header_title')}
            </h1>
            <p className='text-gray-500 mt-2'>
              {t('gp_voting_header_subtitle_prefix')}
              {votes.length} {t('gp_voting_header_subtitle_suffix')}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className='px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium'
          >
            {t('gp_voting_create_button')}
          </button>
        </div>

        {/* Content */}
        {votes.length === 0 ? (
          <EmptyVoting setShowModal={setShowModal} />
        ) : (
          <div className='flex-1 overflow-y-auto pr-2'>
            <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-6'>
              {votes.map((vote) => (
                <VoteCard key={vote.votingId} vote={vote} groupId={Number(groupId)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          groupId={Number(groupId)}
        />
      )}
    </div>
  )
}

function VoteCard({ vote, groupId }: { vote: Voting; groupId: number }) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<string | null>(null)
  const isActive = vote.status === 'ACTIVE'

  const options = Object.entries(vote.options).map(([id, text]) => ({
    id,
    text,
    votes: Number(vote.results[id] || 0)
  }))

  const voteMutation = useMutation({
    mutationFn: (payload: VotingSubmitPayload) => userApi.voting(payload),
    onSuccess: () => {
      toast.success(t('gp_voting_card_toast_submit_success'))
      setTimeout(() => window.location.reload(), 500)
    },
    onError: (error: any) => {
      showErrorToast({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        message: error.response?.data?.message || t('gp_voting_card_toast_submit_error'),
        timestamp: new Date()
      })
    }
  })

  const handleVote = () => {
    if (selected) {
      voteMutation.mutate({ groupId, votingId: vote.votingId, selectedOption: selected })
    }
  }

  return (
    <div className='bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full'>
      {/* Header */}
      <div className='p-5 bg-gradient-to-r from-gray-50 to-white border-b flex-shrink-0'>
        <div className='flex items-start gap-3 mb-3'>
          <h3 className='font-bold text-gray-900 flex-1 line-clamp-2 leading-snug'>{vote.title}</h3>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {isActive ? vote.timeRemaining : t('gp_voting_card_status_closed')}
          </span>
        </div>
        <p className='text-sm text-gray-600 line-clamp-2 mb-3'>{vote.description}</p>
        <div className='flex items-center gap-2 text-xs text-gray-500'>
          <span className='font-medium'>
            {vote.totalVotes}/{vote.totalMembers} {t('gp_voting_card_voted_label')}
          </span>
          <span>•</span>
          <span>{vote.createdByName}</span>
        </div>
      </div>

      {/* Options */}
      <div className='p-5 space-y-2.5 bg-gray-50 flex-1 overflow-y-auto'>
        {options.map((opt) => {
          const percent = vote.totalVotes > 0 ? Math.round((opt.votes / vote.totalVotes) * 100) : 0
          const isSelected = selected === opt.id || vote.userVote === opt.id
          const canClick = !vote.hasVoted && isActive && !voteMutation.isPending

          return (
            <button
              key={opt.id}
              onClick={() => canClick && setSelected(opt.id)}
              disabled={!canClick}
              className={`w-full min-h-[52px] p-3.5 rounded-xl text-sm text-left relative transition-all flex items-center ${
                isSelected ? 'ring-2 ring-blue-500 bg-white shadow-md' : 'bg-white hover:bg-gray-50 hover:shadow-sm'
              } ${canClick ? 'cursor-pointer' : 'cursor-default'} ${voteMutation.isPending ? 'opacity-50' : ''}`}
            >
              {vote.hasVoted && (
                <div
                  className='absolute inset-0 bg-gradient-to-r from-blue-100/40 to-transparent rounded-xl transition-all duration-500'
                  style={{ width: `${percent}%` }}
                />
              )}
              <div className='relative flex items-center justify-between gap-2 w-full'>
                <span className='font-medium text-gray-900 flex-1'>{opt.text}</span>
                {vote.hasVoted && (
                  <span className='text-sm font-bold text-blue-600'>
                    {opt.votes} {t('gp_voting_card_voted_label')}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className='p-5 bg-white border-t flex-shrink-0'>
        {vote.estimatedAmount && vote.estimatedAmount > 0 && (
          <div className='mb-3'>
            <span className='text-xs text-gray-600'>
              {t('gp_voting_card_estimated_label')}{' '}
              <span className='font-semibold text-blue-600'>{vote.estimatedAmount.toLocaleString('en-US')}$</span>
            </span>
          </div>
        )}

        {!vote.hasVoted && isActive ? (
          <button
            onClick={handleVote}
            disabled={!selected || voteMutation.isPending}
            className='w-full px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:shadow-md disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all'
          >
            {voteMutation.isPending ? t('gp_voting_card_submit_button_loading') : t('gp_voting_card_submit_button')}
          </button>
        ) : vote.hasVoted ? (
          <div className='w-full px-4 py-2.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg text-center'>
            {t('gp_voting_card_voted_status')}
          </div>
        ) : (
          <div className='w-full px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg text-center'>
            {t('gp_voting_card_ended_status')}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateModal({
  onClose,
  onCreate,
  isLoading,
  groupId
}: {
  onClose: () => void
  onCreate: (data: CreateVotingPayload) => void
  isLoading: boolean
  groupId: number
}) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [options, setOptions] = useState(['', ''])

  const handleSubmit = () => {
    if (!title.trim()) return toast.warning(t('gp_voting_create_modal_warning_title'))

    const validOptions = options.filter((o) => o.trim())
    if (validOptions.length < 2) return toast.warning(t('gp_voting_create_modal_warning_options'))
    if (!deadline) return toast.warning(t('gp_voting_create_modal_warning_end_time'))

    onCreate({
      groupId,
      title: title.trim(),
      description: description.trim(),
      votingType: 'SINGLE_CHOICE',
      options: validOptions.map((opt, idx) => ({ key: `option${idx + 1}`, label: opt.trim() })),
      deadline: new Date(deadline).toISOString()
    })
  }

  return (
    <div
      onClick={onClose}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50'
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='bg-white rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl'
      >
        <h2 className='text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent'>
          {t('gp_voting_create_modal_title')}
        </h2>

        <div className='space-y-4'>
          {/* Title */}
          <div>
            <label className='block text-sm font-semibold mb-2'>{t('gp_voting_create_modal_title_label')}</label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('gp_voting_create_modal_title_placeholder')}
              maxLength={100}
              className='w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors'
            />
          </div>

          {/* Description */}
          <div>
            <label className='block text-sm font-semibold mb-2'>{t('gp_voting_create_modal_description_label')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('gp_voting_create_modal_description_placeholder')}
              rows={2}
              maxLength={200}
              className='w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none resize-none transition-colors'
            />
          </div>

          {/* Deadline */}
          <div>
            <label className='block text-sm font-semibold mb-2'>{t('gp_voting_create_modal_end_time_label')}</label>
            <input
              type='datetime-local'
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className='w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors'
            />
          </div>

          {/* Options */}
          <div>
            <label className='block text-sm font-semibold mb-2'>{t('gp_voting_create_modal_options_label')}</label>
            <div className='space-y-2'>
              {options.map((opt, i) => (
                <div key={i} className='flex gap-2'>
                  <input
                    type='text'
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options]
                      newOpts[i] = e.target.value
                      setOptions(newOpts)
                    }}
                    placeholder={`${t('gp_voting_create_modal_options_label').split(' ')[0]} ${i + 1}`}
                    maxLength={50}
                    className='flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors'
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                      className='w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-colors'
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                onClick={() => setOptions([...options, ''])}
                className='mt-3 text-blue-600 text-sm font-semibold hover:underline'
              >
                {t('gp_voting_create_modal_add_option')}
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className='flex gap-3 mt-8'>
          <button
            onClick={onClose}
            disabled={isLoading}
            className='flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors'
          >
            {t('gp_voting_create_modal_cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className='flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:from-gray-300 disabled:to-gray-300 transition-all'
          >
            {isLoading ? t('gp_voting_create_modal_creating') : t('gp_voting_create_modal_create')}
          </button>
        </div>
      </div>
    </div>
  )
}

