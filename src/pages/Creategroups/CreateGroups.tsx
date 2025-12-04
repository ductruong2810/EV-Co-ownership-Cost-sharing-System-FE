import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import type { SubmitHandler } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Fragment } from 'react/jsx-runtime'
import { useEffect, useState } from 'react'
import groupApi from '../../apis/group.api'
import Skeleton from '../../components/Skeleton'
import path from '../../constants/path'
import { createGroupSchema, type CreateGroupSchema } from '../../utils/rule'
import FileUpload from './components/FileUpload'
import Header from './components/Header'
import NumberInput from './components/NumberInput'
import TextAreaInput from './components/TextAreaInput'
import TextInput from './components/TextInput'
import PriceInput from './components/PriceInput/PriceInput'
import type { AutoFillInfo } from '../../types/api/group.type'
import { useI18n } from '../../i18n/useI18n'

export default function CreateGroups() {
  const { t } = useI18n()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FieldValues>({
    resolver: yupResolver<FieldValues>(createGroupSchema),
    mode: 'onSubmit',
    defaultValues: {
      vehicleImage: null,
      registrationImage: null
    }
  })

  const vehicleImage = watch('vehicleImage')
  const registrationImage = watch('registrationImage')
  const navigate = useNavigate()
  const [ocrResult, setOcrResult] = useState<AutoFillInfo | null>(null)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)

  const groupMutation = useMutation({
    mutationFn: (body: FormData) => groupApi.CreateGroup(body),
    onSuccess: (response) => {
      console.log('Create group successful:', response?.data)
      toast.success(t('cg_toast_create_success'))
      const fullPath = `${path.dashBoard}/${path.viewGroups}`
      navigate(fullPath)
    },
    onError: (error) => {
      toast.error(t('cg_toast_create_failed'))
      console.error('Create group failed:', error)
    }
  })

  // Auto-fill from OCR when registration image is uploaded
  useEffect(() => {
    const processOcr = async () => {
      if (registrationImage && registrationImage.length > 0) {
        const file = registrationImage[0]
        setIsProcessingOcr(true)
        try {
          const response = await groupApi.autoFillVehicleInfo(file)
          const autoFillInfo = response.data
          setOcrResult(autoFillInfo)

          // Auto-fill form fields if OCR extracted data
          if (autoFillInfo.extractedLicensePlate && !watch('licensePlate')) {
            setValue('licensePlate', autoFillInfo.extractedLicensePlate)
          }
          if (autoFillInfo.extractedChassisNumber && !watch('chassisNumber')) {
            setValue('chassisNumber', autoFillInfo.extractedChassisNumber)
          }
          if (autoFillInfo.extractedBrand && !watch('brand')) {
            // Note: brand field might not exist in form, adjust as needed
          }
          if (autoFillInfo.extractedModel && !watch('model')) {
            // Note: model field might not exist in form, adjust as needed
          }

          if (autoFillInfo.isRegistrationDocument) {
            toast.success(t('cg_ocr_success'), { autoClose: 2000 })
          } else {
            toast.warning(t('cg_ocr_not_registration'), {
              autoClose: 3000
            })
          }
        } catch (error) {
          console.error('OCR processing failed:', error)
          toast.error(t('cg_ocr_failed'))
        } finally {
          setIsProcessingOcr(false)
        }
      } else {
        setOcrResult(null)
      }
    }

    processOcr()
  }, [registrationImage, setValue, watch])

  const onSubmit: SubmitHandler<CreateGroupSchema> = (data) => {
    const formData = new FormData()
    formData.append('groupName', data.groupName)
    formData.append('description', data.description || '')
    formData.append('memberCapacity', data.maxMembers.toString())
    formData.append('vehicleValue', data.assetValue.toString())
    formData.append('licensePlate', data.licensePlate)
    formData.append('chassisNumber', data.chassisNumber)

    if (data.vehicleImage && data.vehicleImage.length > 0) {
      Array.from(data.vehicleImage).forEach((file) => {
        formData.append('vehicleImages', file)
        formData.append('imageTypes', 'VEHICLE')
      })
    }

    if (data.registrationImage && data.registrationImage.length > 0) {
      Array.from(data.registrationImage).forEach((file) => {
        formData.append('vehicleImages', file)
        formData.append('imageTypes', 'REGISTRATION')
      })
    }
    groupMutation.mutate(formData)
  }

  return (
    <Fragment>
      {groupMutation.isPending && <Skeleton />}

      <div className='min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-600 flex items-center justify-center p-6 relative overflow-hidden'>
        {/* Holographic Background Effects */}
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

        <motion.div
          className='max-w-2xl w-full relative z-10'
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Premium Liquid Glass Card */}
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            className='backdrop-blur-[60px] bg-gradient-to-br from-white/22 via-white/16 to-white/20 rounded-[2rem] shadow-[0_15px_70px_rgba(6,182,212,0.5),0_30px_100px_rgba(14,165,233,0.4),0_0_150px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border-[4px] border-white/60 p-8 overflow-hidden'
          >
            {/* Top Gradient Bar */}
            <div className='absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]' />

            {/* Header */}
            <Header />

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              className='space-y-5 mt-6'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {/* Group Info */}
              <div className='grid grid-cols-2 gap-4'>
                <TextInput
                  label={t('cg_field_group_name_label')}
                  placeholder={t('cg_field_group_name_placeholder')}
                  register={register('groupName')}
                  error={errors.groupName?.message}
                />
                <PriceInput
                  label={t('cg_field_asset_value_label')}
                  placeholder={t('cg_field_asset_value_placeholder')}
                  register={register('assetValue')}
                  error={errors.assetValue?.message}
                  formatNumber={true}
                />
              </div>

              {/* License Info */}
              <div className='grid grid-cols-2 gap-4'>
                <TextInput
                  label={t('cg_field_license_plate_label')}
                  placeholder={t('cg_field_license_plate_placeholder')}
                  register={register('licensePlate')}
                  error={errors.licensePlate?.message}
                />
                <TextInput
                  label={t('cg_field_chassis_label')}
                  placeholder={t('cg_field_chassis_placeholder')}
                  register={register('chassisNumber')}
                  error={errors.chassisNumber?.message}
                />
              </div>

              {/* Image Uploads */}
              <div className='grid grid-cols-2 gap-4'>
                <FileUpload
                  label={t('cg_field_vehicle_image_label')}
                  file={vehicleImage || null}
                  register={register('vehicleImage')}
                  onRemove={(file) => {
                    if (vehicleImage) {
                      const dt = new DataTransfer()
                      Array.from(vehicleImage)
                        .filter((f) => f !== file)
                        .forEach((f) => dt.items.add(f))
                      setValue('vehicleImage', dt.files.length ? dt.files : null)
                    }
                  }}
                  color='teal'
                  error={errors.vehicleImage?.message}
                />
                <div className='space-y-2'>
                  <FileUpload
                    label={t('cg_field_registration_image_label')}
                    file={registrationImage || null}
                    register={register('registrationImage')}
                    onRemove={(file) => {
                      if (registrationImage) {
                        const dt = new DataTransfer()
                        Array.from(registrationImage)
                          .filter((f) => f !== file)
                          .forEach((f) => dt.items.add(f))
                        setValue('registrationImage', dt.files.length ? dt.files : null)
                        setOcrResult(null)
                      }
                    }}
                    color='teal'
                    error={errors.registrationImage?.message}
                  />
                  {isProcessingOcr && (
                    <div className='flex items-center gap-2 text-sm text-blue-600'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600' />
                      <span>{t('cg_ocr_processing')}</span>
                    </div>
                  )}
                  {ocrResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-3 text-xs'
                    >
                      <div className='font-semibold text-green-900 mb-2'>✓ OCR Extracted:</div>
                      <div className='space-y-1 text-gray-700'>
                        {ocrResult.extractedLicensePlate && (
                          <div>
                            {t('cg_ocr_license_plate')}{' '}
                            <span className='font-semibold'>{ocrResult.extractedLicensePlate}</span>
                          </div>
                        )}
                        {ocrResult.extractedChassisNumber && (
                          <div>
                            {t('cg_ocr_chassis')}{' '}
                            <span className='font-semibold'>{ocrResult.extractedChassisNumber}</span>
                          </div>
                        )}
                        {ocrResult.extractedBrand && (
                          <div>
                            {t('cg_ocr_brand')}{' '}
                            <span className='font-semibold'>{ocrResult.extractedBrand}</span>
                          </div>
                        )}
                        {ocrResult.extractedModel && (
                          <div>
                            {t('cg_ocr_model')}{' '}
                            <span className='font-semibold'>{ocrResult.extractedModel}</span>
                          </div>
                        )}
                      </div>
                      {ocrResult.processingTime && (
                        <div className='text-xs text-gray-500 mt-2'>
                          {t('cg_ocr_processed_in')} {ocrResult.processingTime}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Member Count */}
              <NumberInput
                label={t('cg_field_member_count_label')}
                placeholder={t('cg_field_member_count_placeholder')}
                register={register('maxMembers')}
                error={errors.maxMembers?.message}
              />

              {/* Description */}
              <TextAreaInput
                label={t('cg_field_description_label')}
                placeholder={t('cg_field_description_placeholder')}
                register={register('description')}
                error={errors.description?.message}
              />

              {/* Submit Button */}
              <motion.button
                type='submit'
                disabled={groupMutation.isPending}
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 0 40px rgba(6,182,212,0.8), 0 0 60px rgba(14,165,233,0.5)'
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className='w-full bg-gradient-to-r from-cyan-400 to-sky-500 text-white py-3.5 rounded-xl font-bold text-lg tracking-wide shadow-[0_8px_32px_rgba(6,182,212,0.6),0_0_20px_rgba(6,182,212,0.4)] border-[2px] border-white/40 hover:border-white/60 transition-all duration-400 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {groupMutation.isPending ? t('cg_submit_pending') : t('cg_submit_create')}
              </motion.button>
            </motion.form>

            {/* Bottom Gradient Bar */}
            <div className='absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-200 via-sky-100 to-cyan-200 shadow-[0_0_20px_rgba(14,165,233,0.6)]' />
          </motion.div>
        </motion.div>
      </div>
    </Fragment>
  )
}
