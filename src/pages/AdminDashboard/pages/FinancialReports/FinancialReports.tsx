import { useState } from 'react'
import { Button, DatePicker, Select, Card, Space, Typography, Alert } from 'antd'
import { DownloadOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons'
import { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import staffApi from '../../../../apis/staff.api'
import Skeleton from '../../../../components/Skeleton'
import { exportFinancialReportToPDF, type FinancialReportData } from '../../../../utils/pdfExport'

const { Option } = Select
const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function FinancialReports() {
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
      setError('Export failed. Please try again.')
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
      setError('PDF export failed. Please try again.')
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
    <div className='min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6'>
      <div className='max-w-4xl mx-auto'>
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <FileTextOutlined className='text-3xl text-green-600' />
            <Title level={2} className='mb-0'>
              Financial Reports
            </Title>
          </div>
          <Text className='text-gray-600'>
            Export consolidated financial reports for all groups in the system
          </Text>
        </div>

        {error && (
          <Alert
            message='Error'
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
                Fund Type (Optional)
              </Text>
              <Select
                value={fundType || 'ALL'}
                onChange={(value) => setFundType(value === 'ALL' ? undefined : value)}
                className='w-full'
                size='large'
              >
                <Option value='ALL'>All</Option>
                <Option value='OPERATING'>Operating Fund</Option>
                <Option value='DEPOSIT_RESERVE'>Deposit Reserve Fund</Option>
              </Select>
            </div>

            <div>
              <Text strong className='block mb-2'>
                Date Range (Optional)
              </Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates || [null, null])}
                className='w-full'
                size='large'
                format='DD/MM/YYYY'
                placeholder={['From Date', 'To Date']}
              />
              <Text type='secondary' className='block mt-2 text-xs'>
                Leave empty to export all data
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
                  {isExporting ? 'Exporting...' : 'Export CSV Report'}
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
                  {isExportingPDF ? 'Generating PDF...' : 'Export PDF Report'}
                </Button>
              </Space>
            </div>
          </Space>
        </Card>

        <Card className='mt-6 rounded-xl shadow-lg border border-gray-200'>
          <Title level={4} className='mb-3'>
            Report Information
          </Title>
          <Space direction='vertical' size='small' className='text-sm text-gray-600'>
            <div>
              <Text strong>• Report includes:</Text>
              <ul className='ml-6 mt-1 space-y-1'>
                <li>Total income/expense for each group</li>
                <li>Operating and Deposit Reserve balances</li>
                <li>Consolidated summary of all groups</li>
              </ul>
            </div>
            <div>
              <Text strong>• Formats available:</Text>
              <ul className='ml-6 mt-1 space-y-1'>
                <li>CSV - Comma Separated Values (Excel, Google Sheets)</li>
                <li>PDF - Portable Document Format (Professional report)</li>
              </ul>
            </div>
            <div>
              <Text strong>• PDF includes:</Text>
              <ul className='ml-6 mt-1 space-y-1'>
                <li>Formatted table with all financial data</li>
                <li>Summary totals and statistics</li>
                <li>Professional layout suitable for printing</li>
              </ul>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}

