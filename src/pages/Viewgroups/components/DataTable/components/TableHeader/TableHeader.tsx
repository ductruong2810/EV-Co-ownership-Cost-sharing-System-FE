import { useI18n } from '../../../../../../i18n/useI18n'

export default function TableHeader() {
  const { t } = useI18n()

  return (
    <thead>
      <tr className='bg-slate-700/50 border-b-2 border-teal-400/50'>
        <th className='px-4 py-3 text-left font-semibold text-teal-200 text-sm'>{t('vg_table_col_id')}</th>
        <th className='px-4 py-3 text-left font-semibold text-teal-200 text-sm'>{t('vg_table_col_name')}</th>
        <th className='px-4 py-3 text-left font-semibold text-teal-200 text-sm'>{t('vg_table_col_status')}</th>
        <th className='px-4 py-3 text-left font-semibold text-teal-200 text-sm'>{t('vg_table_col_description')}</th>
      </tr>
    </thead>
  )
}
