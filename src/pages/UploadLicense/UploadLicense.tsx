import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import Field from './components/Field'
import ProgressBar from './components/ProgressBar'
import Button from './components/Button'
import OCRPreview from '../../components/OCRPreview/OCRPreview'
import OCREditor from '../../components/OCREditor/OCREditor'
import userApi from '../../apis/user.api'
import { toast } from 'react-toastify'
import type { DocumentInfo } from '../../types/api/user.type'

export type DocType = 'gplx' | 'cccd'
export type DocSide = 'front' | 'back'

export interface DocFiles {
  front: File | null
  back: File | null
}

type PreviewOcrPayload = {
  frontFile: File
  backFile: File
  documentType: 'DRIVER_LICENSE' | 'CITIZEN_ID'
}

type UploadPayload = {
  frontFile: File
  backFile: File
  editedInfo?: DocumentInfo
}

type OcrApiResponse = {
  documentInfo?: DocumentInfo
  processingTime?: string
}

type ApiErrorResponse = {
  message?: string
  errors?: { message?: string }[]
}

type UploadDocLabel = 'driver license' | 'citizen ID'

const buildUploadError = (error: unknown, docLabel: UploadDocLabel) => {
  const axiosError = error as AxiosError<ApiErrorResponse>
  const errorData = axiosError.response?.data
  const status = axiosError.response?.status
  const docCodeLabel = docLabel === 'driver license' ? 'driver license (GPLX)' : 'citizen ID (CCCD)'

  let errorMessage = `Failed to upload ${docLabel}. Please try again.`
  let errorTitle = 'Upload Failed'

  if (errorData) {
    if (errorData.message) {
      errorMessage = errorData.message
    } else if (errorData.errors && errorData.errors.length > 0) {
      errorMessage = errorData.errors[0].message || errorMessage
    } else if (typeof errorData === 'string') {
      errorMessage = errorData
    }

    switch (status) {
      case 409:
        errorTitle = 'Document Already Exists'
        errorMessage =
          errorData.message ||
          `This ${docLabel} number has already been registered by another user. Please check your document number.`
        break
      case 413:
        errorTitle = 'File Too Large'
        errorMessage =
          'The image file is too large. Maximum size is 10MB. Please compress or resize your image and try again.'
        break
      case 400:
        if (errorData.message?.includes('Document type mismatch')) {
          errorTitle = 'Wrong Document Type'
          errorMessage = `The uploaded image does not match the selected document type. Please upload a valid ${docCodeLabel}.`
        } else if (errorData.message?.includes('Unable to extract text')) {
          errorTitle = 'OCR Processing Failed'
          errorMessage =
            'Unable to read text from the image. Please ensure:\n• The image is clear and in focus\n• The document is fully visible\n• There is good lighting\n• The image is not blurry or rotated'
        } else if (errorData.message?.includes('must be different')) {
          errorTitle = 'Invalid Images'
          errorMessage = `Front and back images must be different. Please upload two different images of your ${docLabel}.`
        } else if (errorData.message?.includes('must not be empty')) {
          errorTitle = 'Missing File'
          errorMessage = `Please upload both front and back images of your ${docLabel}.`
        } else if (errorData.message?.includes('must be an image')) {
          errorTitle = 'Invalid File Type'
          errorMessage = 'Please upload image files only (JPG, PNG, etc.). Other file types are not supported.'
        }
        break
      case 500:
      case 503:
        errorTitle = 'Server Error'
        errorMessage = 'The server is temporarily unavailable. Please try again in a few moments.'
        break
      case 401:
      case 403:
        errorTitle = 'Authentication Required'
        errorMessage = 'Your session has expired. Please log in again.'
        break
      default:
        break
    }
  } else if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
    errorTitle = 'Request Timeout'
    errorMessage = 'The upload is taking too long. Please check your internet connection and try again.'
  } else if (axiosError.message) {
    errorMessage = axiosError.message
  }

  return { errorTitle, errorMessage }
}

export default function UploadLicense() {
  const [activeTab, setActiveTab] = useState<DocType>('gplx')
  const [uploadSuccess, setUploadSuccess] = useState<Record<DocType, boolean>>({
    gplx: false,
    cccd: false
  })

  // State to hold uploaded document files
  const [docs, setDocs] = useState<Record<DocType, DocFiles>>({
    gplx: { front: null, back: null },
    cccd: { front: null, back: null }
  })

  // State to hold OCR extracted information
  const [ocrResults, setOcrResults] = useState<Record<DocType, DocumentInfo | null>>({
    gplx: null,
    cccd: null
  })

  const [processingTime, setProcessingTime] = useState<Record<DocType, string>>({
    gplx: '',
    cccd: ''
  })

  // State for OCR preview/edit flow
  const [showOcrEditor, setShowOcrEditor] = useState<Record<DocType, boolean>>({
    gplx: false,
    cccd: false
  })

  const [isPreviewingOcr, setIsPreviewingOcr] = useState(false)

  // Preview OCR mutation
  const previewOcrMutation = useMutation({
    mutationFn: ({ frontFile, backFile, documentType }: PreviewOcrPayload) =>
      userApi.previewOcr(documentType, frontFile, backFile),
    onSuccess: (data) => {
      const response = data.data as OcrApiResponse
      if (response?.documentInfo) {
        const docType = activeTab
        setOcrResults((prev) => ({ ...prev, [docType]: response.documentInfo }))
        if (response.processingTime) {
          setProcessingTime((prev) => ({ ...prev, [docType]: response.processingTime }))
        }
        setShowOcrEditor((prev) => ({ ...prev, [docType]: false }))
      }
      setIsPreviewingOcr(false)
    },
    onError: (error) => {
      console.error('Failed to preview OCR:', error)
      setIsPreviewingOcr(false)
      toast.error('Failed to extract information from image. Please try again.', { autoClose: 3000 })
    }
  })

  const uploadLicenseMutation = useMutation({
    mutationFn: ({ frontFile, backFile, editedInfo }: UploadPayload) =>
      userApi.uploadLicense(frontFile, backFile, editedInfo),
    onSuccess: (data) => {
      console.log('Upload driver license successfully:', data)
      const response = data.data as OcrApiResponse
      if (response?.documentInfo) {
        setOcrResults((prev) => ({ ...prev, gplx: response.documentInfo }))
        if (response.processingTime) {
          setProcessingTime((prev) => ({ ...prev, gplx: response.processingTime }))
        }
      }
      setUploadSuccess((prev) => ({ ...prev, gplx: true }))
      setShowOcrEditor((prev) => ({ ...prev, gplx: false }))
      toast.success(
        <div>
          <div className='font-semibold mb-1'>✓ Upload Successful</div>
          <div className='text-sm'>Your driver license has been uploaded and is being reviewed.</div>
        </div>,
        {
          autoClose: 3000,
          position: 'top-right'
        }
      )
    },
    onError: (error) => {
      console.error('Failed to upload driver license:', error)
      const { errorTitle, errorMessage } = buildUploadError(error, 'driver license')

      toast.error(
        <div>
          <div className='font-semibold mb-1'>{errorTitle}</div>
          <div className='text-sm whitespace-pre-line'>{errorMessage}</div>
        </div>,
        {
          autoClose: 5000,
          position: 'top-right',
          className: 'toast-error-custom'
        }
      )
    }
  })

  const uploadCitizenIdMutation = useMutation({
    mutationFn: ({ frontFile, backFile, editedInfo }: UploadPayload) =>
      userApi.uploadCitizenId(frontFile, backFile, editedInfo),
    onSuccess: (data) => {
      console.log('Upload citizen ID successfully:', data)
      const response = data.data as OcrApiResponse
      if (response?.documentInfo) {
        setOcrResults((prev) => ({ ...prev, cccd: response.documentInfo }))
        if (response.processingTime) {
          setProcessingTime((prev) => ({ ...prev, cccd: response.processingTime }))
        }
      }
      setUploadSuccess((prev) => ({ ...prev, cccd: true }))
      setShowOcrEditor((prev) => ({ ...prev, cccd: false }))
      toast.success(
        <div>
          <div className='font-semibold mb-1'>✓ Upload Successful</div>
          <div className='text-sm'>Your citizen ID has been uploaded and is being reviewed.</div>
        </div>,
        {
          autoClose: 3000,
          position: 'top-right'
        }
      )
    },
    onError: (error) => {
      console.error('Failed to upload citizen ID:', error)
      const { errorTitle, errorMessage } = buildUploadError(error, 'citizen ID')

      toast.error(
        <div>
          <div className='font-semibold mb-1'>{errorTitle}</div>
          <div className='text-sm whitespace-pre-line'>{errorMessage}</div>
        </div>,
        {
          autoClose: 5000,
          position: 'top-right',
          className: 'toast-error-custom'
        }
      )
    }
  })

  const currentUploadedCount = useMemo(() => {
    const currentDoc = docs[activeTab]
    let count = 0
    if (currentDoc.front) count++
    if (currentDoc.back) count++
    return count
  }, [docs, activeTab])

  const isCurrentTabReady = useMemo(() => currentUploadedCount === 2, [currentUploadedCount])

  const isUploading = uploadLicenseMutation.isPending || uploadCitizenIdMutation.isPending
  const isProcessing = isUploading || isPreviewingOcr || previewOcrMutation.isPending

  const handleFileChange = (type: DocType, side: DocSide, file: File | null) => {
    setDocs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [side]: file
      }
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (activeTab === 'gplx') {
      if (!docs.gplx.front || !docs.gplx.back) {
        toast.warning(
          <div>
            <div className='font-semibold mb-1'>Missing Files</div>
            <div className='text-sm'>Please upload both front and back images of your driver license to continue.</div>
          </div>,
          {
            autoClose: 3000,
            position: 'top-right'
          }
        )
        return
      }
      // Preview OCR first
      setIsPreviewingOcr(true)
      previewOcrMutation.mutate({
        frontFile: docs.gplx.front,
        backFile: docs.gplx.back,
        documentType: 'DRIVER_LICENSE'
      })
    } else {
      if (!docs.cccd.front || !docs.cccd.back) {
        toast.warning(
          <div>
            <div className='font-semibold mb-1'>Missing Files</div>
            <div className='text-sm'>Please upload both front and back images of your citizen ID to continue.</div>
          </div>,
          {
            autoClose: 3000,
            position: 'top-right'
          }
        )
        return
      }
      // Preview OCR first
      setIsPreviewingOcr(true)
      previewOcrMutation.mutate({
        frontFile: docs.cccd.front,
        backFile: docs.cccd.back,
        documentType: 'CITIZEN_ID'
      })
    }
  }

  const handleConfirmOcr = (editedInfo: DocumentInfo) => {
    if (activeTab === 'gplx') {
      if (!docs.gplx.front || !docs.gplx.back) return
      uploadLicenseMutation.mutate({
        frontFile: docs.gplx.front,
        backFile: docs.gplx.back,
        editedInfo
      })
    } else {
      if (!docs.cccd.front || !docs.cccd.back) return
      uploadCitizenIdMutation.mutate({
        frontFile: docs.cccd.front,
        backFile: docs.cccd.back,
        editedInfo
      })
    }
  }

  const handleCancelEdit = () => {
    setShowOcrEditor((prev) => ({ ...prev, [activeTab]: false }))
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-600 relative overflow-hidden'>
      {/* Holographic Background */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className='absolute top-20 right-20 w-[500px] h-[500px] bg-cyan-300/40 rounded-full blur-[120px]'
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className='absolute bottom-20 left-20 w-[500px] h-[500px] bg-indigo-400/40 rounded-full blur-[120px]'
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, delay: 1 }}
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-sky-300/35 rounded-full blur-[100px]'
        />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className='relative z-10 w-full max-w-4xl backdrop-blur-[60px] bg-gradient-to-br from-white/22 via-white/16 to-white/20 rounded-[2.5rem] shadow-[0_15px_70px_rgba(6,182,212,0.5),0_30px_100px_rgba(14,165,233,0.4),0_0_150px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border-[4px] border-white/60 p-8 space-y-6 overflow-hidden'
      >
        {/* Top Bar */}
        <div className='absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]' />

        {/* Header */}
        <div className='text-center space-y-3'>
          <h1 className='text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.7)]'>Upload Documents</h1>
          <p className='text-white/75 text-sm font-medium'>Upload your driver license and citizen ID in any order</p>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 p-2 bg-white/10 backdrop-blur-lg rounded-xl border-[2px] border-white/30'>
          {(['gplx', 'cccd'] as const).map((tab) => (
            <button
              key={tab}
              type='button'
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-400 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] border-[2px] border-white/40'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className='flex items-center justify-center gap-2'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  stroke='currentColor'
                  className='w-5 h-5'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z'
                  />
                </svg>
                <span>{tab === 'gplx' ? 'Driver License' : 'Citizen ID'}</span>
                {uploadSuccess[tab] && (
                  <span className='ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-green-400 text-white text-xs font-bold shadow-[0_0_15px_rgba(74,222,128,0.8)]'>
                    ✓
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <ProgressBar uploadedCount={currentUploadedCount} maxCount={2} />

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className='space-y-6'
        >
          <div className='space-y-4'>
            <h3 className='text-lg font-bold text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className='w-6 h-6'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z'
                />
              </svg>
              {activeTab === 'gplx' ? 'Driver License (GPLX)' : 'Citizen ID (CCCD)'}
            </h3>
            <div className='grid md:grid-cols-2 gap-4'>
              <Field
                type={activeTab}
                side='front'
                label='Front side'
                handleFileChange={handleFileChange}
                docs={docs}
                disabled={isUploading}
              />
              <Field
                type={activeTab}
                side='back'
                label='Back side'
                handleFileChange={handleFileChange}
                docs={docs}
                disabled={isUploading}
              />
            </div>
          </div>

          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='flex items-center justify-center gap-3 bg-cyan-400/20 backdrop-blur-lg border-[2px] border-cyan-300/40 rounded-xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            >
              <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-200' />
              <span className='text-white font-semibold'>Uploading...</span>
            </motion.div>
          )}

          {(uploadLicenseMutation.isError || uploadCitizenIdMutation.isError) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='flex items-center gap-3 bg-red-400/20 backdrop-blur-lg border-[2px] border-red-300/40 rounded-xl p-4 shadow-[0_0_20px_rgba(248,113,113,0.3)]'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className='w-5 h-5 text-red-200'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'
                />
              </svg>
              <span className='text-red-200 font-semibold'>Upload failed, please try again!</span>
            </motion.div>
          )}

          {/* OCR Results Preview */}
          {ocrResults[activeTab] && (
            <div className='space-y-4'>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <OCRPreview
                  documentInfo={ocrResults[activeTab]!}
                  documentType={activeTab}
                  processingTime={processingTime[activeTab]}
                  onConfirm={() => handleConfirmOcr(ocrResults[activeTab]!)}
                  onEdit={() => setShowOcrEditor((prev) => ({ ...prev, [activeTab]: true }))}
                />
              </motion.div>

              {showOcrEditor[activeTab] && (
                <motion.div
                  key={`${activeTab}-${ocrResults[activeTab]?.idNumber || 'editor'}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <OCREditor
                    documentInfo={ocrResults[activeTab]!}
                    documentType={activeTab}
                    processingTime={processingTime[activeTab]}
                    onConfirm={handleConfirmOcr}
                    onCancel={handleCancelEdit}
                  />
                </motion.div>
              )}
            </div>
          )}

          {uploadSuccess[activeTab] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='flex items-center gap-3 bg-gradient-to-r from-green-400/20 to-emerald-400/20 backdrop-blur-lg border-[2px] border-green-300/40 rounded-xl p-4 shadow-[0_0_20px_rgba(74,222,128,0.3)]'
            >
              <div className='flex-shrink-0'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={2.5}
                  stroke='currentColor'
                  className='w-6 h-6 text-green-200'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <div className='flex flex-col'>
                <span className='text-green-200 font-semibold'>
                  Upload {activeTab === 'gplx' ? 'driver license' : 'citizen ID'} successfully!
                </span>
                <span className='text-green-200/70 text-xs mt-0.5'>
                  Your document is being reviewed. You'll be notified once it's approved.
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {!ocrResults[activeTab] && (
          <Button
            isReady={isCurrentTabReady && !isProcessing && !uploadSuccess[activeTab]}
            uploadedCount={currentUploadedCount}
            currentStep={activeTab === 'gplx' ? 1 : 2}
            isUploading={isProcessing}
          />
        )}

        <div className='flex items-center justify-center gap-4 pt-4 border-t-[2px] border-white/20'>
          {(['gplx', 'cccd'] as const).map((type) => (
            <div
              key={type}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-lg transition-all duration-400 ${
                uploadSuccess[type]
                  ? 'bg-green-400/20 border-[2px] border-green-300/40 shadow-[0_0_20px_rgba(74,222,128,0.3)]'
                  : 'bg-white/10 border-[2px] border-white/20'
              }`}
            >
              <span className='text-sm text-white font-medium'>
                {type === 'gplx' ? 'Driver License' : 'Citizen ID'}:
              </span>
              <span className={`text-sm font-bold ${uploadSuccess[type] ? 'text-green-200' : 'text-white/60'}`}>
                {uploadSuccess[type] ? '✓ Completed' : 'Not uploaded'}
              </span>
            </div>
          ))}
        </div>

        <div className='absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-200 via-sky-100 to-cyan-200 shadow-[0_0_20px_rgba(14,165,233,0.6)]' />
      </motion.form>
    </div>
  )
}
