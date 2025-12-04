import { useState } from 'react'
import { Button, DatePicker, Select, Card, Space, Typography, Alert } from 'antd'
import { DownloadOutlined, FilePdfOutlined, DollarOutlined } from '@ant-design/icons'
import { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import staffApi from '../../../../apis/staff.api'
import Skeleton from '../../../../components/Skeleton'
import { exportFinancialReportToPDF, type FinancialReportData } from '../../../../utils/pdfExport'
import AdminPageContainer from '../../AdminPageContainer'
import AdminPageHeader from '../../AdminPageHeader'
import { useI18n } from '../../../../i18n/useI18n'

const { Option } = Select
const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function FinancialReports() {
  const { t } = useI18n()
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [fundType, setFundType] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)

      const params: {
        fundType?: string
        from?: string
        to?: string
      } = {}

      if (fundType && fundType !== 'ALL') {
        params.fundType = fundType
      }

      if (dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].toISOString()
        params.to = dateRange[1].toISOString()
      }

      const response = await staffApi.exportAllGroupsFinancialReport(params)
      const blob = response.data
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename with timestamp
      const timestamp = dayjs().format('YYYYMMDD_HHmmss')
      const filename = `financial_reports_all_groups_${timestamp}.csv`
      link.setAttribute('download', filename)

      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      setError(t('admin_financial_reports_export_error'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true)
      setError(null)

      // TODO: Replace with actual API call to get JSON data
      // For now, we'll parse CSV or use a separate endpoint
      // This is a placeholder - you may need to create a new API endpoint that returns JSON
      const params: {
        fundType?: string
        from?: string
        to?: string
      } = {}

      if (fundType && fundType !== 'ALL') {
        params.fundType = fundType
      }

      if (dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].toISOString()
        params.to = dateRange[1].toISOString()
      }

      // Option 1: If BE provides JSON endpoint, use it:
      // const response = await staffApi.getFinancialReportData(params)
      // exportFinancialReportToPDF(response.data, { fundType, dateRange: { from: params.from || null, to: params.to || null } })

      // Option 2: Parse CSV (temporary solution)
      const csvResponse = await staffApi.exportAllGroupsFinancialReport(params)
      const csvText = await csvResponse.data.text()
      const parsedData = parseCSVToFinancialData(csvText)

      exportFinancialReportToPDF(parsedData, {
        fundType: fundType || 'ALL',
        dateRange: {
          from: params.from || null,
          to: params.to || null
        }
      })
    } catch (err) {
      console.error('PDF Export error:', err)
      setError(t('admin_financial_reports_pdf_export_error'))
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Helper function to parse CSV to FinancialReportData
  const parseCSVToFinancialData = (csvText: string): FinancialReportData[] => {
    const lines = csvText.split('\n').filter((line) => line.trim())
    if (lines.length < 2) return []

    // Skip header row
    const dataLines = lines.slice(1)
    const data: FinancialReportData[] = []

    for (const line of dataLines) {
      const columns = line.split(',').map((col) => col.trim().replace(/^"|"$/g, ''))
      if (columns.length < 6) continue

      try {
        data.push({
          groupName: columns[0] || 'Unknown',
          totalIncome: parseFloat(columns[1]?.replace(/[^\d.-]/g, '') || '0'),
          totalExpense: parseFloat(columns[2]?.replace(/[^\d.-]/g, '') || '0'),
          operatingBalance: parseFloat(columns[3]?.replace(/[^\d.-]/g, '') || '0'),
          depositReserveBalance: parseFloat(columns[4]?.replace(/[^\d.-]/g, '') || '0'),
          netBalance: parseFloat(columns[5]?.replace(/[^\d.-]/g, '') || '0')
        })
      } catch (e) {
        console.warn('Failed to parse CSV row:', line, e)
      }
    }

    return data
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        eyebrow={t('admin_financial_reports_eyebrow')}
        title={t('admin_financial_reports_title')}
        subtitle={t('admin_financial_reports_subtitle')}
        rightSlot={<DollarOutlined className='text-2xl text-green-600' />}
      />

        {error && (
          <Alert
            message={t('admin_financial_reports_error_title')}
            description={error}
            type='error'
            showIcon
            closable
            onClose={() => setError(null)}
            className='mb-6'
          />
        )}

        <Card className='rounded-xl shadow-lg border border-gray-200'>
          <Space direction='vertical' size='large' className='w-full'>
            <div>
              <Text strong className='block mb-2'>
                {t('admin_financial_reports_fund_type_label')}
              </Text>
              <Select
                value={fundType || 'ALL'}
                onChange={(value) => setFundType(value === 'ALL' ? undefined : value)}
                className='w-full'
                size='large'
              >
                <Option value='ALL'>{t('admin_financial_reports_fund_type_all')}</Option>
                <Option value='OPERATING'>{t('admin_financial_reports_fund_type_operating')}</Option>
                <Option value='DEPOSIT_RESERVE'>{t('admin_financial_reports_fund_type_deposit_reserve')}</Option>
              </Select>
            </div>

            <div>
              <Text strong className='block mb-2'>
                {t('admin_financial_reports_date_range_label')}
              </Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates || [null, null])}
                className='w-full'
                size='large'
                format='DD/MM/YYYY'
                placeholder={[t('admin_dashboard_range_from_date_placeholder'), t('admin_dashboard_range_to_date_placeholder')]}
              />
              <Text type='secondary' className='block mt-2 text-xs'>
                {t('admin_financial_reports_date_range_hint')}
              </Text>
            </div>

            <div className='pt-4 border-t'>
              <Space direction='vertical' size='middle' className='w-full'>
                <Button
                  type='primary'
                  icon={<DownloadOutlined />}
                  size='large'
                  loading={isExporting}
                  onClick={handleExport}
                  className='w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  block
                >
                  {isExporting ? t('admin_financial_reports_exporting') : t('admin_financial_reports_export_csv')}
                </Button>
                <Button
                  type='default'
                  icon={<FilePdfOutlined />}
                  size='large'
                  loading={isExportingPDF}
                  onClick={handleExportPDF}
                  className='w-full border-2 border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600'
                  block
                >
                  {isExportingPDF ? t('admin_financial_reports_generating_pdf') : t('admin_financial_reports_export_pdf')}
                </Button>
              </Space>
            </div>
          </Space>
        </Card>

      <Card className='mt-6 rounded-xl shadow-lg border border-gray-200'>
          <Title level={4} className='mb-3'>
            {t('admin_financial_reports_info_title')}
          </Title>
          <Space direction='vertical' size='small' className='text-sm text-gray-600'>
            <div>
              <Text strong>{t('admin_financial_reports_info_includes')}</Text>
              <ul className='ml-6 mt-1 space-y-1'>
                <li>{t('admin_financial_reports_info_income_expense')}</li>
                <li>{t('admin_financial_reports_info_balances')}</li>
                <li>{t('admin_financial_reports_info_summary')}</li>
              </ul>
            </div>
            <div>
              <Text strong>{t('admin_financial_reports_info_formats')}</Text>
              <ul className='ml-6 mt-1 space-y-1'>
                <li>{t('admin_financial_reports_info_csv')}</li>
                <li>{t('admin_financial_reports_info_pdf')}</li>
              </ul>
            </div>
            <div>
              <Text strong>{t('admin_financial_reports_info_pdf_includes')}</Text>
              <ul className='ml-6 mt-1 space-y-1'>
                <li>{t('admin_financial_reports_info_pdf_table')}</li>
                <li>{t('admin_financial_reports_info_pdf_totals')}</li>
                <li>{t('admin_financial_reports_info_pdf_layout')}</li>
              </ul>
            </div>
          </Space>
      </Card>
    </AdminPageContainer>
  )
}

