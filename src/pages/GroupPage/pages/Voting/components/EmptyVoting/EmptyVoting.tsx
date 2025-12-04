import { useI18n } from '../../../../../../i18n/useI18n'

interface IEmptyVoting {
  setShowModal: (test: boolean) => void
}

function EmptyVoting({ setShowModal }: IEmptyVoting) {
  const { t } = useI18n()

  return (
    <div className='flex items-center justify-center w-full h-[500px]'>
      <div className='flex flex-col items-center text-center bg-white/70 backdrop-blur-sm rounded-2xl p-10 shadow-md hover:shadow-lg transition-all duration-300'>
        <div className='w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mb-6'>
          <span className='text-6xl'>🗳️</span>
        </div>

        <h3 className='text-2xl font-semibold text-gray-800 mb-2'>{t('gp_empty_voting_title')}</h3>
        <p className='text-gray-500 mb-6'>{t('gp_empty_voting_subtitle')}</p>

        <button
          onClick={() => setShowModal(true)}
          className='px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold'
        >
          {t('gp_empty_voting_button')}
        </button>
      </div>
    </div>
  )
}

export default EmptyVoting

