import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Spin, Typography, DatePicker, Select, Space, Button, Alert } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  CarOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined
} from '@ant-design/icons'
import { Column, Pie, Line, Bar } from '@ant-design/plots'
import type { PieConfig, ColumnConfig, LineConfig, BarConfig } from '@ant-design/plots'
import dayjs, { Dayjs } from 'dayjs'
import { useState, useEffect } from 'react'
import adminApi from '../../../../apis/admin.api'
import type { DashboardStatistics } from '../../../../types/api/dashboard.type'
import logger from '../../../../utils/logger'

const { Title } = Typography
const { RangePicker } = DatePicker
const { MonthPicker } = DatePicker
const { Option } = Select

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount)
}

// Format currency for display in cards (shorter format for large numbers)
const formatCurrencyCompact = (amount: number) => {
  if (amount >= 1000000000) {
    // Billions - format as "X.XXB ₫"
    return `${(amount / 1000000000).toFixed(2)}B ₫`
  } else if (amount >= 1000000) {
    // Millions - format as "X.XXM ₫"
    return `${(amount / 1000000).toFixed(2)}M ₫`
  } else if (amount >= 1000) {
    // Thousands - format as "X.XXK ₫"
    return `${(amount / 1000).toFixed(2)}K ₫`
  }
  return formatCurrency(amount)
}

type PeriodType = 'DAY' | 'WEEK' | 'MONTH'

export default function Dashboard() {
  // Default to today for lighter query and avoid errors
  const today = dayjs()
  const defaultFromDate = today.startOf('day')
  const defaultToDate = today.endOf('day')
  
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([defaultFromDate, defaultToDate])
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('DAY')
  const [dateFilterType, setDateFilterType] = useState<'range' | 'month' | 'preset'>('preset')
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Store periodType in localStorage for sidebar badge and dispatch custom event
  useEffect(() => {
    localStorage.setItem('dashboardPeriodType', periodType)
    // Dispatch custom event for same-origin updates
    window.dispatchEvent(new Event('periodTypeChanged'))
  }, [periodType])

  // Preset date handlers
  const handlePresetClick = (preset: string) => {
    setDateFilterType('preset')
    setActivePreset(preset) // Track which preset is actively selected
    setSelectedMonth(null)
    setDateRange([null, null])
    
    const today = dayjs()
    let fromDate: Dayjs | null = null
    let toDate: Dayjs | null = null
    
    switch (preset) {
      case 'today':
        fromDate = today.startOf('day')
        toDate = today.endOf('day')
        setPeriodType('DAY')
        break
      case 'thisWeek':
        // Calculate week starting from Monday
        // dayjs: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const dayOfWeek = today.day()
        // Calculate days to Monday of current week
        // If Sunday (0): Monday is 6 days ago -> -6
        // If Monday (1): today is Monday -> 0
        // If Tuesday-Saturday (2-6): Monday is (dayOfWeek - 1) days ago -> -(dayOfWeek - 1)
        // But user wants Monday to be 17/11 when today is 23/11 (Saturday)
        // If 23/11 is Saturday (6), and Monday should be 17/11, that's 6 days back
        // So for Saturday, we need -6, not -5
        // Let's use: dayOfWeek === 0 ? -6 : dayOfWeek === 1 ? 0 : -dayOfWeek
        // But that gives Tuesday (2) -> -2 (should be -1)
        // Actually, the issue might be that dayjs considers week to start on Sunday
        // So we need to adjust: if dayOfWeek is 0 (Sunday), Monday is -6 days
        // If dayOfWeek is 6 (Saturday), Monday should be -6 days? No, that's wrong.
        // Let me recalculate: Saturday (6) to Monday (1) = 5 days back = -5
        // But user says it should be 17/11, which is 6 days back = -6
        // Maybe 23/11/2025 is actually Sunday, not Saturday?
        // For now, let's use a simpler approach: get Monday of ISO week
        // dayjs has isoWeek plugin, but we don't import it. Let's calculate manually:
        // ISO week starts on Monday. dayjs.day() returns 0-6 where 0=Sunday
        // To convert to ISO (Monday=0, Sunday=6): isoDay = (dayOfWeek + 6) % 7
        const isoDay = (dayOfWeek + 6) % 7 // Monday=0, Tuesday=1, ..., Sunday=6
        const daysToMonday = -isoDay
        fromDate = today.add(daysToMonday, 'day').startOf('day')
        toDate = fromDate.add(6, 'day').endOf('day')
        setPeriodType('WEEK')
        break
      case 'thisMonth':
        fromDate = today.startOf('month')
        toDate = today.endOf('month')
        setPeriodType('MONTH')
        break
      case 'last7Days':
        fromDate = today.subtract(6, 'day').startOf('day')
        toDate = today.endOf('day')
        setPeriodType('DAY')
        break
      case 'last30Days':
        fromDate = today.subtract(29, 'day').startOf('day')
        toDate = today.endOf('day')
        setPeriodType('DAY')
        break
      case 'all':
        fromDate = null
        toDate = null
        setPeriodType('MONTH')
        break
      default:
        break
    }
    
    if (fromDate && toDate) {
      setDateRange([fromDate, toDate])
    }
  }

  const handleMonthChange = (month: Dayjs | null) => {
    setDateFilterType('month')
    setActivePreset(null) // Clear preset when using month picker
    setSelectedMonth(month)
    setDateRange([null, null])
    
    if (month) {
      const startOfMonth = month.startOf('month')
      const endOfMonth = month.endOf('month')
      setDateRange([startOfMonth, endOfMonth])
      setPeriodType('MONTH')
    }
  }

  const handleRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateFilterType('range')
    setActivePreset(null) // Clear preset when using range picker
    setSelectedMonth(null)
    setDateRange(dates || [null, null])
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminDashboardStatistics', dateRange, periodType],
    queryFn: () => {
      const params: any = { periodType }
      if (dateRange[0] && dateRange[1]) {
        params.fromDate = dateRange[0].format('YYYY-MM-DD')
        params.toDate = dateRange[1].format('YYYY-MM-DD')
      }
      return adminApi.getDashboardStatistics(params)
    },
    refetchInterval: 30000,
    retry: 1, // Chỉ retry 1 lần khi lỗi
    retryOnMount: false // Không retry khi mount lại
  })

  const statistics: DashboardStatistics | undefined = data?.data?.data

  // Helper function to format role name
  const formatRoleName = (role: string) => {
    return role
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper function to format status name
  const formatStatusName = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  }

  // Color mapping for different roles - using original role keys
  const roleColorMap: Record<string, string> = {
    'CO_OWNER': '#52c41a',    // Green
    'STAFF': '#1890ff',       // Blue
    'TECHNICIAN': '#722ed1',  // Purple
    'ADMIN': '#ff4d4f'        // Red
  }

  // Prepare chart data - Only if statistics exists
  // Define order for roles to ensure consistent display
  const roleOrder = ['Co Owner', 'Staff', 'Technician', 'Admin']
  
  const usersByRoleEntries = statistics ? Object.entries(statistics.usersByRole || {}) : []
  const usersByRoleData = usersByRoleEntries
    .map(([role, count]) => {
      const formattedRole = formatRoleName(role)
      // Use original role key for color lookup, then formatted name for display
      return {
        type: formattedRole,
        value: Number(count) || 0,
        color: roleColorMap[role] || '#1890ff', // Use original role key for color
        order: roleOrder.indexOf(formattedRole) // Add order for sorting
      }
    })
    .filter((d) => d.value > 0) // Filter out zero values
    .sort((a, b) => {
      // First sort by order (if exists), then by value descending
      if (a.order !== -1 && b.order !== -1) {
        return a.order - b.order // Sort by predefined order
      }
      return b.value - a.value // Fallback to value descending
    })
  
  const finalUsersByRoleData = usersByRoleData

  // Debug: Log to verify data structure
  console.log('Bar chart data:', finalUsersByRoleData)
  console.log('Statistics usersByRole:', statistics?.usersByRole)

  // Payment Status Data for Pie Chart
  const paymentStatusData = statistics ? [
    { type: 'Success', value: statistics.successfulPayments || 0 },
    { type: 'Pending', value: statistics.pendingPayments || 0 },
    { type: 'Failed', value: statistics.failedPayments || 0 }
  ].filter((d) => d.value > 0) : []

  // Revenue Data for Line Chart (trend)
  const revenueData = statistics ? Object.entries(statistics.revenueByMonth || {})
    .sort()
    .map(([period, revenue]) => ({
      period,
      revenue: Number(revenue) || 0
    })) : []

  const hasRevenueData = revenueData.length > 0
  const hasPositiveRevenue = revenueData.some((d) => d.revenue > 0)

  // Chart configurations - Multiple chart types
  // 1. Pie Chart for Users by Role (simpler and clearer)
  const usersByRolePieConfig: PieConfig = {
    data: finalUsersByRoleData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: (datum: any) => {
      return datum.color || roleColorMap[datum.type] || '#1890ff'
    },
    label: {
      offset: 12,
      content: (item: any) => `${item.type}: ${item.value} users`,
      style: {
        fontSize: 12,
        fontWeight: 500
      }
    },
    legend: {
      position: 'bottom',
      itemName: {
        formatter: (text: string) => text
      }
    },
    interactions: [{ type: 'elementActive' }],
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        },
        content: 'Total\n' + finalUsersByRoleData.reduce((sum, d) => sum + d.value, 0) + ' users'
      }
    },
    autoFit: true
  }

  // 2. Groups by Status Pie Chart
  const groupsByStatusEntries = statistics ? Object.entries(statistics.groupsByStatus || {}) : []
  const groupsByStatusData = groupsByStatusEntries
    .map(([status, count]) => ({
      type: formatStatusName(status),
      value: Number(count) || 0
    }))
    .filter((d) => d.value > 0)

  const groupsByStatusPieConfig: PieConfig = {
    data: groupsByStatusData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: ['#52c41a', '#faad14', '#ff4d4f'], // Green, Yellow, Red for Active, Pending, Inactive
    label: {
      offset: 12,
      content: (item: any) => `${item.type}: ${item.value}`,
      style: { fontWeight: 500 }
    },
    legend: {
      position: 'bottom'
    },
    interactions: [{ type: 'elementActive' }],
    autoFit: true
  }

  // 2. Line Chart for Revenue Trend
  const lineConfig: LineConfig = {
    data: revenueData,
    xField: 'period',
    yField: 'revenue',
    smooth: true,
    color: '#52c41a',
    point: {
      size: 5,
      shape: 'circle'
    },
    label: {
      formatter: (datum: any) => {
        const value = Number(datum.revenue)
        return value > 0 ? formatCurrency(value) : ''
      }
    },
    meta: {
      revenue: {
        alias: 'Doanh Thu',
        formatter: (value: number) => formatCurrency(value)
      },
      period: {
        alias: periodType === 'WEEK' ? 'Tuần' : periodType === 'DAY' ? 'Ngày' : 'Tháng'
      }
    },
    xAxis: {
      label: {
        autoRotate: false
      }
    },
    yAxis: {
      label: {
        formatter: (value: number) => {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`
          }
          if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`
          }
          return value.toString()
        }
      }
    },
    autoFit: true
  }

  // 3. Pie Chart for Payment Status
  const paymentPieConfig: PieConfig = {
    appendPadding: 10,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: ['#52c41a', '#faad14', '#ff4d4f'], // Green, Yellow, Red
    label: {
      offset: 12,
      content: (item: any) => `${item.type}: ${item.value}`,
      style: { fontWeight: 500 }
    },
    interactions: [{ type: 'elementActive' }],
    legend: {
      position: 'bottom'
    },
    autoFit: true
  }

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'DAY':
        return 'Day'
      case 'WEEK':
        return 'Week'
      case 'MONTH':
        return 'Month'
      default:
        return 'Month'
    }
  }

  // Helper function to check if a preset is active
  // Only return true if this specific preset was clicked (not just if date range matches)
  const isPresetActive = (preset: string) => {
    // Only highlight if this preset was explicitly selected
    return dateFilterType === 'preset' && activePreset === preset
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Dashboard Report</h1>
          <p className='text-gray-600'>System overview and statistics</p>
        </div>

        {/* Error Alert - Always show filters even when error */}
        {error && (
          <Alert
            message='Failed to load data'
            description='Please try selecting a different time range or try again later.'
            type='error'
            showIcon
            closable
            className='mb-4'
            action={
              <Button size='small' onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {/* Loading overlay - Only show spinner, keep filters visible */}
        {isLoading && (
          <div className='mb-4 flex items-center justify-center py-4'>
            <Spin size='small' /> <span className='ml-2 text-gray-600'>Loading data...</span>
          </div>
        )}
        
        {/* Date Filter Section */}
        <Card className='shadow-lg border border-gray-200 mb-6'>
            <div className='mb-4'>
              <span className='text-sm font-semibold text-gray-700'>Filter by time:</span>
            </div>
            
            {/* Preset Buttons */}
            <div className='mb-4 flex flex-wrap gap-2'>
              <Button
                type={isPresetActive('all') ? 'primary' : 'default'}
                onClick={() => handlePresetClick('all')}
                className='shadow-sm'
              >
                All
              </Button>
              <Button
                type={isPresetActive('today') ? 'primary' : 'default'}
                onClick={() => handlePresetClick('today')}
                className='shadow-sm'
              >
                Today
              </Button>
              <Button
                type={isPresetActive('thisWeek') ? 'primary' : 'default'}
                onClick={() => handlePresetClick('thisWeek')}
                className='shadow-sm'
              >
                This Week
              </Button>
              <Button
                type={isPresetActive('thisMonth') ? 'primary' : 'default'}
                onClick={() => handlePresetClick('thisMonth')}
                className='shadow-sm'
              >
                This Month
              </Button>
              <Button
                type={isPresetActive('last7Days') ? 'primary' : 'default'}
                onClick={() => handlePresetClick('last7Days')}
                className='shadow-sm'
              >
                Last 7 Days
              </Button>
              <Button
                type={isPresetActive('last30Days') ? 'primary' : 'default'}
                onClick={() => handlePresetClick('last30Days')}
                className='shadow-sm'
              >
                Last 30 Days
              </Button>
            </div>

            {/* Date Filters */}
            <Space wrap className='w-full'>
          <Select
            value={periodType}
            onChange={(value) => setPeriodType(value)}
                style={{ width: 140 }}
                className='shadow-sm'
          >
                <Option value='DAY'>By Day</Option>
            <Option value='WEEK'>By Week</Option>
            <Option value='MONTH'>By Month</Option>
          </Select>
              
              <MonthPicker
                value={selectedMonth}
                onChange={handleMonthChange}
                format='MM/YYYY'
                placeholder='Select month'
                style={{ width: 160 }}
                className='shadow-sm'
              />
              
          <RangePicker
            value={dateRange}
            onChange={handleRangeChange}
            format='DD/MM/YYYY'
            placeholder={['From date', 'To date']}
                style={{ width: 320 }}
                className='shadow-sm'
          />
            </Space>
          </Card>

        {/* Main Content */}
      {/* Overview Cards */}
        {statistics ? (
          <Row gutter={[20, 20]} className='mb-8'>
        <Col xs={24} sm={12} lg={6}>
              <Card 
                className='shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500 h-full'
                bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
            <Statistic
                  title={<span className='text-gray-600 font-medium'>Total Users</span>}
              value={statistics.totalUsers}
                  prefix={<UserOutlined className='text-green-500' />}
                  valueStyle={{ color: '#3f8600', fontSize: '28px', fontWeight: 'bold' }}
            />
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <span className='text-sm text-gray-500'>Active: </span>
                  <span className='text-sm font-semibold text-green-600'>{statistics.activeUsers}</span>
                </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
              <Card 
                className='shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500 h-full'
                bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
            <Statistic
                  title={<span className='text-gray-600 font-medium'>Total Groups</span>}
              value={statistics.totalGroups}
                  prefix={<TeamOutlined className='text-blue-500' />}
                  valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <span className='text-sm text-gray-500'>Active: </span>
                  <span className='text-sm font-semibold text-blue-600'>{statistics.activeGroups}</span>
                </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
              <Card 
                className='shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500 h-full'
                bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
            <Statistic
                  title={<span className='text-gray-600 font-medium'>Total Vehicles</span>}
              value={statistics.totalVehicles}
                  prefix={<CarOutlined className='text-purple-500' />}
                  valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
            />
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <span className='text-sm text-gray-500'>All vehicles in system</span>
                </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
              <Card 
                className='shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500 h-full'
                bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
            <Statistic
                  title={<span className='text-gray-600 font-medium'>Total Revenue</span>}
              value={formatCurrencyCompact(statistics.totalRevenue)}
                  prefix={<DollarOutlined className='text-red-500' />}
                  valueStyle={{ 
                    color: '#cf1322', 
                    fontSize: '28px', 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                />
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <span className='text-sm text-gray-500'>{statistics.successfulPayments} successful transactions</span>
                </div>
              </Card>
            </Col>
          </Row>
        ) : (
          <Row gutter={[20, 20]} className='mb-8'>
            <Col span={24}>
              <Card className='shadow-md'>
                <div className='text-center py-12 text-gray-400'>
                  {isLoading ? 'Loading data...' : 'No data available. Please select a different time range.'}
                </div>
          </Card>
        </Col>
      </Row>
        )}

        {/* Charts Row - Only show when statistics exists - Using Pie charts for simplicity */}
        {statistics && (
          <Row gutter={[20, 20]} className='mb-8'>
            {/* Pie Chart: Users by Role */}
            <Col xs={24} lg={8}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>Users by Role</span>}
                className='shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '20px' }}
              >
                {finalUsersByRoleData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...usersByRolePieConfig} />
              </div>
            ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400'>
                    No user data available
                  </div>
            )}
          </Card>
        </Col>

            {/* Pie Chart: Groups by Status */}
            <Col xs={24} lg={8}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>Groups by Status</span>}
                className='shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '20px' }}
              >
                {groupsByStatusData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...groupsByStatusPieConfig} />
              </div>
            ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400'>
                    No group data available
                  </div>
            )}
          </Card>
        </Col>

            {/* Pie Chart: Payment Status */}
            <Col xs={24} lg={8}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>Transaction Status</span>}
                className='shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '20px' }}
              >
                {paymentStatusData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...paymentPieConfig} data={paymentStatusData} />
              </div>
            ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400'>
                    No transaction data available
                  </div>
            )}
          </Card>
        </Col>
          </Row>
        )}

        {/* Revenue Trend Line Chart - Full Width */}
        {statistics && (
          <Row gutter={[20, 20]} className='mb-8'>
            <Col xs={24}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>Revenue Trend by {getPeriodLabel()}</span>}
                className='shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '24px' }}
              >
                {hasRevenueData && hasPositiveRevenue ? (
                  <div style={{ height: 380 }}>
                    <Line {...lineConfig} />
                  </div>
                ) : hasRevenueData ? (
                  <div className='flex h-[380px] flex-col items-center justify-center gap-2 text-center'>
                    <LineChartOutlined className='text-4xl text-emerald-500' />
                    <p className='text-base font-semibold text-gray-600'>No revenue in this time period</p>
                    <p className='text-sm text-gray-400'>Try selecting a wider range or another date filter.</p>
                  </div>
                ) : (
                  <div className='flex h-[380px] items-center justify-center text-gray-400'>
                    No revenue data available for this time period
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}

      {/* Statistics Cards */}
        {statistics && (
          <Row gutter={[20, 20]} className='mb-8'>
        <Col xs={24} lg={8}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>User Statistics</span>}
                className='h-full shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '24px' }}
              >
                <Row gutter={[16, 20]}>
              <Col span={12}>
                    <Statistic 
                      title={<span className='text-gray-600 text-sm'>Co-Owners</span>} 
                      value={statistics.totalCoOwners} 
                      prefix={<UserOutlined className='text-green-500' />}
                      valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
                    />
              </Col>
              <Col span={12}>
                    <Statistic 
                      title={<span className='text-gray-600 text-sm'>Staff</span>} 
                      value={statistics.totalStaff} 
                      prefix={<UserOutlined className='text-blue-500' />}
                      valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
                    />
              </Col>
              <Col span={12}>
                    <Statistic 
                      title={<span className='text-gray-600 text-sm'>Technicians</span>} 
                      value={statistics.totalTechnicians} 
                      prefix={<UserOutlined className='text-purple-500' />}
                      valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
                    />
              </Col>
              <Col span={12}>
                    <Statistic 
                      title={<span className='text-gray-600 text-sm'>Admins</span>} 
                      value={statistics.totalAdmins} 
                      prefix={<UserOutlined className='text-red-500' />}
                      valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
                    />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>Transaction Statistics</span>}
                className='h-full shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '24px' }}
              >
                <Row gutter={[16, 20]}>
              <Col span={12}>
                    <Statistic 
                      title={<span className='text-gray-600 text-sm'>Total Transactions</span>} 
                      value={statistics.totalPayments} 
                      prefix={<DollarOutlined className='text-blue-500' />}
                      valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
                    />
              </Col>
              <Col span={12}>
                <Statistic
                      title={<span className='text-gray-600 text-sm'>Success</span>}
                  value={statistics.successfulPayments}
                      prefix={<CheckCircleOutlined className='text-green-500' />}
                      valueStyle={{ color: '#3f8600', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                      title={<span className='text-gray-600 text-sm'>Pending</span>}
                  value={statistics.pendingPayments}
                      prefix={<ClockCircleOutlined className='text-yellow-500' />}
                      valueStyle={{ color: '#faad14', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                      title={<span className='text-gray-600 text-sm'>Failed</span>}
                  value={statistics.failedPayments}
                      prefix={<CloseCircleOutlined className='text-red-500' />}
                      valueStyle={{ color: '#cf1322', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
              <Card 
                title={<span className='text-lg font-semibold text-gray-800'>Recent Activity (30 Days)</span>}
                className='h-full shadow-md hover:shadow-lg transition-shadow duration-300'
                bodyStyle={{ padding: '24px' }}
              >
                <Row gutter={[16, 20]}>
              <Col span={12}>
                <Statistic
                      title={<span className='text-gray-600 text-sm'>New Users</span>}
                  value={statistics.newUsersLast30Days}
                      prefix={<UserOutlined className='text-green-500' />}
                      valueStyle={{ color: '#3f8600', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                      title={<span className='text-gray-600 text-sm'>New Groups</span>}
                  value={statistics.newGroupsLast30Days}
                      prefix={<TeamOutlined className='text-blue-500' />}
                      valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                      title={<span className='text-gray-600 text-sm'>New Contracts</span>}
                  value={statistics.newContractsLast30Days}
                      prefix={<FileTextOutlined className='text-purple-500' />}
                      valueStyle={{ color: '#722ed1', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
        )}
      </div>
    </div>
  )
}
