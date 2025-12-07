import { motion } from 'framer-motion'

interface IButton {
  isReady: boolean
  uploadedCount: number
  currentStep: 1 | 2
  isUploading: boolean
}

function Button({ isReady, uploadedCount, currentStep, isUploading }: IButton) {
  const isLastStep = currentStep === 2

  const getButtonText = () => {
    if (isUploading) {
      return 'Uploading...'
    }
    if (isReady) {
      return isLastStep ? '✓ Upload & Complete' : 'Preview & Continue →'
    }
    return `Missing ${2 - uploadedCount} side(s)`
  }

  const getTooltipText = () => {
    if (isUploading) {
      return 'Please wait while uploading...'
    }
    if (!isReady) {
      return `Please upload ${2 - uploadedCount} more image${2 - uploadedCount > 1 ? 's' : ''} to continue`
    }
    return isLastStep ? 'Upload both documents and complete registration' : 'Preview OCR results and continue to next document'
  }

  return (
    <div className='relative group'>
      <motion.button
        whileHover={{ scale: isReady && !isUploading ? 1.02 : 1 }}
        whileTap={{ scale: isReady && !isUploading ? 0.98 : 1 }}
        type='submit'
        disabled={!isReady || isUploading}
        title={getTooltipText()}
        className='flex-1 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 flex items-center justify-center gap-2 w-full'
      >
        {isUploading && <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white' />}
        {getButtonText()}
      </motion.button>
      {!isReady && (
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10'>
          {getTooltipText()}
          <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900' />
        </div>
      )}
    </div>
  )
}

export default Button
