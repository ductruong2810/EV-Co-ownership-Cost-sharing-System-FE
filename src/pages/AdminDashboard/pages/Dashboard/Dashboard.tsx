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
  LineChartOutlined,
  WarningOutlined,
  ToolOutlined,
  FundProjectionScreenOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  ShoppingOutlined,
  RightOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Column, Pie, Line, Bar } from '@ant-design/plots'
import type { PieConfig, ColumnConfig, LineConfig, BarConfig } from '@ant-design/plots'
import dayjs, { Dayjs } from 'dayjs'
import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import adminApi from '../../../../apis/admin.api'
import type { DashboardStatistics } from '../../../../types/api/dashboard.type'
import logger from '../../../../utils/logger'

const { Title } = Typography
const { RangePicker } = DatePicker
const { MonthPicker } = DatePicker
const { Option } = Select

const formatCurrency = (amount: number | null | undefined) => {
  // Handle null, undefined, NaN, or invalid numbers
  if (amount === null || amount === undefined || isNaN(Number(amount)) || !isFinite(Number(amount))) {
    return '0 ₫'
  }
  const numAmount = Number(amount)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(numAmount)
}

// Format currency for display in cards (shorter format for large numbers)
const formatCurrencyCompact = (amount: number | undefined | null) => {
  if (!amount || isNaN(amount) || amount === 0) {
    return '0 ₫'
  }
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

const formatCount = (value: number | undefined | null) => {
  if (typeof value !== 'number' || !isFinite(value)) {
    return '0'
  }
  return value.toLocaleString('en-US')
}

type PeriodType = 'DAY' | 'WEEK' | 'MONTH'

type QuickStatCard = {
  id: string
  label: string
  value: string
  detailLabel?: string | null
  detailValue: string
  icon: ReactNode
  iconBg: string
  link?: string
  trendValue?: number | null
}

export default function Dashboard() {
  const navigate = useNavigate()
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
        // Backend expects 'from' and 'to' with ISO_DATE_TIME format (includes time)
        params.from = dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss')
        params.to = dateRange[1].endOf('day').format('YYYY-MM-DDTHH:mm:ss')
      }
      return adminApi.getDashboardStatistics(params)
    },
    refetchInterval: (query) => {
      // Disable auto-refetch nếu có lỗi network/server
      const error = query.state.error as any
      const isNetworkError = !error?.response || error?.code === 'ECONNABORTED'
      const isServerError = error?.response?.status >= 500

      // Nếu backend down, không auto-refetch (tránh spam requests)
      if (isNetworkError || isServerError) {
        return false
      }
      return 30000 // Normal: refetch every 30s
    },
    retry: 1, // Chỉ retry 1 lần khi lỗi
    retryOnMount: false // Không retry khi mount lại
  })

  const rawStatistics = data?.data

  // Debug: Log raw statistics to see what backend returns
  if (rawStatistics) {
    console.log('🔍 Raw Statistics from Backend:', {
      totalPaymentAmount: rawStatistics.totalPaymentAmount,
      totalExpenseAmount: rawStatistics.totalExpenseAmount,
      payments: rawStatistics.payments,
      totalPayments: rawStatistics.totalPayments
    })
  }

  // Map backend response to frontend expected format
  const statistics: DashboardStatistics | undefined = rawStatistics
    ? {
        totalUsers: rawStatistics.totalUsers || 0,
        activeUsers: rawStatistics.usersByStatus?.ACTIVE || 0,
        totalCoOwners: rawStatistics.usersByRole?.CO_OWNER || 0,
        totalStaff: rawStatistics.usersByRole?.STAFF || 0,
        totalTechnicians: rawStatistics.usersByRole?.TECHNICIAN || 0,
        totalAdmins: rawStatistics.usersByRole?.ADMIN || 0,
        totalGroups: rawStatistics.totalGroups || 0,
        activeGroups: rawStatistics.groupsByStatus?.ACTIVE || 0,
        pendingGroups: rawStatistics.groupsByStatus?.PENDING || 0,
        closedGroups: rawStatistics.groupsByStatus?.CLOSED || 0,
        totalVehicles: rawStatistics.totalVehicles || 0,
        totalContracts: rawStatistics.totalContracts || 0,
        pendingContracts: rawStatistics.contractsByStatus?.PENDING || 0,
        signedContracts: rawStatistics.contractsByStatus?.SIGNED || 0,
        approvedContracts: rawStatistics.contractsByStatus?.APPROVED || 0,
        rejectedContracts: rawStatistics.contractsByStatus?.REJECTED || 0,
        // Revenue: Try payments.totalAmount first (nested DTO), then fallback to totalPaymentAmount
        totalRevenue: (() => {
          const paymentAmount = rawStatistics.payments?.totalAmount || rawStatistics.totalPaymentAmount
          if (paymentAmount != null) {
            const numAmount = Number(paymentAmount)
            if (!isNaN(numAmount) && isFinite(numAmount)) {
              return numAmount
            }
          }
          return 0
        })(),
        totalPayments: rawStatistics.totalPayments || 0,
        // Use nested DTO if available, fallback to Map
        successfulPayments: rawStatistics.payments?.completed || rawStatistics.paymentsByStatus?.COMPLETED || 0,
        pendingPayments: rawStatistics.payments?.pending || rawStatistics.paymentsByStatus?.PENDING || 0,
        failedPayments: rawStatistics.payments?.failed || rawStatistics.paymentsByStatus?.FAILED || 0,
        totalBookings: rawStatistics.totalBookings || 0,
        confirmedBookings: rawStatistics.bookingsByStatus?.CONFIRMED || 0,
        completedBookings: rawStatistics.bookingsByStatus?.COMPLETED || 0,
        newUsersLast30Days: 0, // Backend doesn't provide this yet
        newGroupsLast30Days: 0, // Backend doesn't provide this yet
        newContractsLast30Days: 0, // Backend doesn't provide this yet
        usersByRole: rawStatistics.usersByRole || {},
        groupsByStatus: rawStatistics.groupsByStatus || {},
        contractsByStatus: rawStatistics.contractsByStatus || {},
        revenueByMonth: rawStatistics.revenueByPeriod || {}, // Use revenueByPeriod from backend
        // Additional fields from backend
        totalDisputes: rawStatistics.totalDisputes || 0,
        disputesByStatus: rawStatistics.disputesByStatus || {},
        totalIncidents: rawStatistics.totalIncidents || 0,
        incidentsByStatus: rawStatistics.incidentsByStatus || {},
        totalMaintenances: rawStatistics.totalMaintenances || 0,
        maintenancesByStatus: rawStatistics.maintenancesByStatus || {},
        bookingsByStatus: rawStatistics.bookingsByStatus || {},
        totalExpenses: rawStatistics.totalExpenses || 0,
        totalExpenseAmount:
          rawStatistics.totalExpenseAmount && !isNaN(Number(rawStatistics.totalExpenseAmount))
            ? Number(rawStatistics.totalExpenseAmount)
            : 0,
        totalFunds: rawStatistics.totalFunds || 0,
        totalFundBalance: rawStatistics.totalFundBalance ? Number(rawStatistics.totalFundBalance) : 0,
        previousTotalRevenue:
          rawStatistics.previousTotalRevenue !== undefined && rawStatistics.previousTotalRevenue !== null
            ? Number(rawStatistics.previousTotalRevenue)
            : undefined,
        previousTotalBookings:
          rawStatistics.previousTotalBookings !== undefined && rawStatistics.previousTotalBookings !== null
            ? Number(rawStatistics.previousTotalBookings)
            : undefined,
        previousTotalGroups:
          rawStatistics.previousTotalGroups !== undefined && rawStatistics.previousTotalGroups !== null
            ? Number(rawStatistics.previousTotalGroups)
            : undefined,
        previousTotalMaintenances:
          rawStatistics.previousTotalMaintenances !== undefined && rawStatistics.previousTotalMaintenances !== null
            ? Number(rawStatistics.previousTotalMaintenances)
            : undefined,
        previousTotalDisputes:
          rawStatistics.previousTotalDisputes !== undefined && rawStatistics.previousTotalDisputes !== null
            ? Number(rawStatistics.previousTotalDisputes)
            : undefined
      }
    : undefined

  const quickStats = useMemo<QuickStatCard[]>(() => {
    if (!statistics) return []
    const openMaintenances =
      statistics.maintenancesByStatus?.IN_PROGRESS || statistics.maintenancesByStatus?.PENDING || 0
    const openDisputes = statistics.disputesByStatus?.OPEN || statistics.disputesByStatus?.PENDING || 0

    const trend = (current?: number, previous?: number | null) => {
      if (
        previous == null ||
        previous === 0 ||
        current == null ||
        typeof current !== 'number' ||
        !Number.isFinite(current)
      ) {
        return null
      }
      const change = ((current - previous) / previous) * 100
      return Number.isFinite(change) ? change : null
    }

    return [
      {
        id: 'revenue',
        label: 'Total Revenue',
        value: formatCurrencyCompact(statistics.totalRevenue),
        detailLabel: null,
        detailValue: `${formatCount(statistics.successfulPayments)} payments`,
        icon: <DollarOutlined className='text-xl' />,
        iconBg: 'bg-emerald-50 text-emerald-600',
        link: 'dashboard',
        trendValue: trend(statistics.totalRevenue, statistics.previousTotalRevenue)
      },
      {
        id: 'funds',
        label: 'Fund Balance',
        value: formatCurrencyCompact(statistics.totalFundBalance),
        detailLabel: null,
        detailValue: `${formatCount(statistics.totalFunds)} funds`,
        icon: <BankOutlined className='text-xl' />,
        iconBg: 'bg-sky-50 text-sky-600',
        link: 'funds'
      },
      {
        id: 'groups',
        label: 'Groups in system',
        value: formatCount(statistics.totalGroups),
        detailLabel: `${formatCount(statistics.pendingGroups)} pending approvals`,
        detailValue: `${formatCount(statistics.activeGroups)} active`,
        icon: <TeamOutlined className='text-xl' />,
        iconBg: 'bg-indigo-50 text-indigo-600',
        link: 'groups',
        trendValue: trend(statistics.totalGroups, statistics.previousTotalGroups)
      },
      {
        id: 'bookings',
        label: 'Bookings',
        value: formatCount(statistics.totalBookings),
        detailLabel: null,
        detailValue: `${formatCount(statistics.completedBookings)} completed`,
        icon: <CalendarOutlined className='text-xl' />,
        iconBg: 'bg-orange-50 text-orange-500',
        link: 'checkBooking',
        trendValue: trend(statistics.totalBookings, statistics.previousTotalBookings)
      },
      {
        id: 'maintenance',
        label: 'Maintenance tasks',
        value: formatCount(statistics.totalMaintenances),
        detailLabel: `${formatCount(openMaintenances)} in progress`,
        detailValue: `${formatCount(statistics.totalMaintenances - openMaintenances)} closed`,
        icon: <ToolOutlined className='text-xl' />,
        iconBg: 'bg-amber-50 text-amber-600',
        link: 'maintenance',
        trendValue: trend(statistics.totalMaintenances, statistics.previousTotalMaintenances)
      },
      {
        id: 'disputes',
        label: 'Support cases',
        value: formatCount(statistics.totalDisputes),
        detailLabel: `${formatCount(openDisputes)} open`,
        detailValue: `${formatCount(statistics.disputesByStatus?.IN_REVIEW || 0)} in review`,
        icon: <ExclamationCircleOutlined className='text-xl' />,
        iconBg: 'bg-rose-50 text-rose-600',
        link: 'disputes',
        trendValue: trend(statistics.totalDisputes, statistics.previousTotalDisputes)
      }
    ]
  }, [statistics])

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
    CO_OWNER: '#52c41a', // Green
    STAFF: '#1890ff', // Blue
    TECHNICIAN: '#722ed1', // Purple
    ADMIN: '#ff4d4f' // Red
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
  const paymentStatusData = statistics
    ? [
        { type: 'Success', value: Number(statistics.successfulPayments) || 0 },
        { type: 'Pending', value: Number(statistics.pendingPayments) || 0 },
        { type: 'Failed', value: Number(statistics.failedPayments) || 0 }
      ].filter((d) => d.value > 0)
    : []

  // Revenue Data for Line Chart (trend)
  const revenueData = statistics
    ? Object.entries(statistics.revenueByMonth || {})
        .sort()
        .map(([period, revenue]) => ({
          period,
          revenue: Number(revenue) || 0
        }))
    : []

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
      type: 'spider',
      offset: '-30%',
      content: ({ type, value }: any) => {
        if (!type || value === undefined || value === null) return ''
        return `${type}\n${value}`
      },
      style: {
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
        fill: '#ffffff', // White text for better visibility
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' // Shadow for better readability
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

  // Debug: Log groups by status data
  console.log('Groups by status data:', groupsByStatusData)

  const groupsByStatusPieConfig: PieConfig = {
    data: groupsByStatusData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: ['#52c41a', '#faad14', '#ff4d4f'], // Green, Yellow, Red for Active, Pending, Inactive
    label: {
      type: 'spider',
      offset: '-30%',
      content: ({ type, value }: any) => {
        if (!type || value === undefined || value === null) return ''
        return `${type}\n${value}`
      },
      style: {
        fontWeight: 600,
        textAlign: 'center',
        fill: '#ffffff', // White text for better visibility
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' // Shadow for better readability
      }
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
      },
      style: {
        fill: '#1f2937', // Dark gray instead of black
        fontSize: 12,
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)' // White shadow for contrast
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
        autoRotate: false,
        style: {
          fill: '#4b5563', // Medium gray instead of black
          fontSize: 12,
          fontWeight: 500
        }
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
        },
        style: {
          fill: '#4b5563', // Medium gray instead of black
          fontSize: 12,
          fontWeight: 500
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
      type: 'spider',
      offset: '-30%',
      content: ({ type, value }: any) => {
        if (!type || value === undefined || value === null || isNaN(value)) return ''
        return `${type}\n${value}`
      },
      style: {
        fontWeight: 600,
        textAlign: 'center',
        fill: '#ffffff', // White text for better visibility
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' // Shadow for better readability
      }
    },
    interactions: [{ type: 'elementActive' }],
    legend: {
      position: 'bottom'
    },
    autoFit: true
  }

  // 4. Bookings by Status Data and Chart
  const bookingsByStatusEntries = statistics ? Object.entries(statistics.bookingsByStatus || {}) : []
  const bookingsByStatusData = bookingsByStatusEntries
    .map(([status, count]) => ({
      type: formatStatusName(status),
      value: Number(count) || 0
    }))
    .filter((d) => d.value > 0)

  const bookingsByStatusPieConfig: PieConfig = {
    data: bookingsByStatusData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: ['#1890ff', '#52c41a', '#faad14', '#ff4d4f'], // Blue, Green, Yellow, Red
    label: {
      type: 'spider',
      offset: '-30%',
      content: ({ type, value }: any) => {
        if (!type || value === undefined || value === null || isNaN(value)) return ''
        return `${type}\n${value}`
      },
      style: {
        fontWeight: 500,
        textAlign: 'center'
      }
    },
    legend: {
      position: 'bottom'
    },
    interactions: [{ type: 'elementActive' }],
    autoFit: true
  }

  // 5. Contracts by Status Data and Chart
  const contractsByStatusEntries = statistics ? Object.entries(statistics.contractsByStatus || {}) : []
  const contractsByStatusData = contractsByStatusEntries
    .map(([status, count]) => ({
      type: formatStatusName(status),
      value: Number(count) || 0
    }))
    .filter((d) => d.value > 0)

  const contractsByStatusPieConfig: PieConfig = {
    data: contractsByStatusData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: ['#faad14', '#52c41a', '#ff4d4f', '#1890ff'], // Yellow, Green, Red, Blue
    label: {
      type: 'spider',
      offset: '-30%',
      content: ({ type, value }: any) => {
        if (!type || value === undefined || value === null || isNaN(value)) return ''
        return `${type}\n${value}`
      },
      style: {
        fontWeight: 500,
        textAlign: 'center'
      }
    },
    legend: {
      position: 'bottom'
    },
    interactions: [{ type: 'elementActive' }],
    autoFit: true
  }

  // 6. Expenses vs Revenue Comparison Chart
  // Debug: Log financial data
  if (statistics) {
    console.log('💰 Financial Data:', {
      totalRevenue: statistics.totalRevenue,
      totalExpenseAmount: statistics.totalExpenseAmount,
      rawTotalRevenue: rawStatistics?.totalPaymentAmount,
      rawTotalExpenseAmount: rawStatistics?.totalExpenseAmount,
      paymentsObject: rawStatistics?.payments
    })
  }

  const financialComparisonData = statistics
    ? [
        {
          type: 'Revenue',
          amount: (() => {
            // Try multiple sources for revenue
            const rev =
              statistics.totalRevenue || rawStatistics?.payments?.totalAmount || rawStatistics?.totalPaymentAmount || 0
            const numRev = Number(rev)
            return rev !== null && rev !== undefined && !isNaN(numRev) && isFinite(numRev) ? numRev : 0
          })()
        },
        {
          type: 'Expenses',
          amount: (() => {
            const exp = statistics.totalExpenseAmount || rawStatistics?.totalExpenseAmount || 0
            const numExp = Number(exp)
            return exp !== null && exp !== undefined && !isNaN(numExp) && isFinite(numExp) ? numExp : 0
          })()
        }
      ]
    : [] // Always show both Revenue and Expenses, even if 0

  const financialComparisonConfig: ColumnConfig = {
    data: financialComparisonData,
    xField: 'type',
    yField: 'amount',
    color: ['#52c41a', '#ff4d4f'], // Green for Revenue, Red for Expenses
    label: {
      position: 'top',
      formatter: (datum: any) => {
        const amount = datum.amount
        // Don't show label if amount is 0, null, undefined, or invalid
        if (
          amount === null ||
          amount === undefined ||
          isNaN(Number(amount)) ||
          !isFinite(Number(amount)) ||
          Number(amount) === 0
        ) {
          return '' // Return empty string to hide label
        }
        return formatCurrency(Number(amount))
      },
      style: {
        fill: '#1f2937', // Dark gray instead of black for better readability
        fontSize: 13,
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)' // White shadow for contrast
      }
    },
    meta: {
      amount: {
        alias: 'Amount',
        formatter: (value: number) => {
          if (value === null || value === undefined || isNaN(Number(value)) || !isFinite(Number(value))) {
            return '0 ₫'
          }
          return formatCurrency(Number(value))
        }
      }
    },
    xAxis: {
      label: {
        style: {
          fill: '#4b5563', // Medium gray instead of black
          fontSize: 13,
          fontWeight: 500
        }
      }
    },
    yAxis: {
      label: {
        style: {
          fill: '#4b5563', // Medium gray instead of black
          fontSize: 12,
          fontWeight: 500
        }
      }
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

  // Calculate warnings
  const openDisputes = statistics
    ? (statistics.disputesByStatus?.OPEN || 0) + (statistics.disputesByStatus?.PENDING || 0)
    : 0
  const overdueMaintenances = statistics
    ? statistics.maintenancesByStatus?.IN_PROGRESS || 0 // Simplified: can enhance with actual overdue check
    : 0
  const hasWarnings = openDisputes > 0 || overdueMaintenances > 0

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header Section */}
        <div className='mb-8'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2'>
                Dashboard Report
              </h1>
              <p className='text-gray-600 text-lg'>System overview and statistics</p>
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-500'>
              <CalendarOutlined />
              <span>{dayjs().format('DD MMMM YYYY')}</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            message='Failed to load data'
            description='Please try selecting a different time range or try again later.'
            type='error'
            showIcon
            closable
            className='mb-6 rounded-lg shadow-sm border-l-4 border-red-500'
            action={
              <Button size='small' type='primary' onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {/* Warning Banner */}
        {hasWarnings && statistics && (
          <Alert
            message={
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <WarningOutlined className='text-xl text-amber-600' />
                  <div>
                    <div className='font-semibold text-gray-900'>Action Required</div>
                    <div className='text-sm text-gray-600 mt-1'>
                      {openDisputes > 0 && (
                        <span>
                          {openDisputes} open dispute{openDisputes > 1 ? 's' : ''} need{openDisputes === 1 ? 's' : ''}{' '}
                          attention
                        </span>
                      )}
                      {openDisputes > 0 && overdueMaintenances > 0 && <span className='mx-2'>•</span>}
                      {overdueMaintenances > 0 && (
                        <span>
                          {overdueMaintenances} maintenance task{overdueMaintenances > 1 ? 's' : ''} in progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  {openDisputes > 0 && (
                    <Button
                      type='link'
                      size='small'
                      onClick={() => navigate('/manager/disputes')}
                      className='flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold'
                    >
                      View Disputes <RightOutlined className='text-xs' />
                    </Button>
                  )}
                  {overdueMaintenances > 0 && (
                    <Button
                      type='link'
                      size='small'
                      onClick={() => navigate('/manager/maintenance')}
                      className='flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold'
                    >
                      View Maintenance <RightOutlined className='text-xs' />
                    </Button>
                  )}
                </div>
              </div>
            }
            type='warning'
            showIcon={false}
            closable
            className='mb-6 rounded-lg shadow-md border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50'
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className='mb-6 flex items-center justify-center py-8 bg-white rounded-xl shadow-sm border border-gray-100'>
            <Spin size='large' />
            <span className='ml-3 text-gray-600 font-medium'>Loading dashboard data...</span>
          </div>
        )}

        {/* Date Filter Section */}
        <Card className='mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm' styles={{ body: { padding: '24px' } }}>
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-gray-800 mb-1'>Filter by time</h3>
            <p className='text-sm text-gray-500'>Select a time period to view statistics</p>
          </div>

          {/* Preset Buttons */}
          <div className='mb-6 flex flex-wrap gap-2'>
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'thisWeek', label: 'This Week' },
              { key: 'thisMonth', label: 'This Month' },
              { key: 'last7Days', label: 'Last 7 Days' },
              { key: 'last30Days', label: 'Last 30 Days' }
            ].map((preset) => (
              <Button
                key={preset.key}
                type={isPresetActive(preset.key) ? 'primary' : 'default'}
                onClick={() => handlePresetClick(preset.key)}
                className={`transition-all duration-200 ${
                  isPresetActive(preset.key) ? 'shadow-md scale-105' : 'hover:shadow-sm hover:scale-102'
                }`}
                size='middle'
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Date Filters */}
          <div className='flex flex-wrap gap-3 items-center'>
            <Select
              value={periodType}
              onChange={(value) => setPeriodType(value)}
              style={{ width: 140 }}
              className='rounded-lg'
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
              className='rounded-lg'
            />

            <RangePicker
              value={dateRange}
              onChange={handleRangeChange}
              format='DD/MM/YYYY'
              placeholder={['From date', 'To date']}
              style={{ width: 320 }}
              className='rounded-lg'
            />
          </div>
        </Card>

        {/* Main Content */}
        {/* Overview Cards */}
        {statistics ? (
          <div className='grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 xl:grid-cols-3'>
            {quickStats.map((card) => (
              <button
                key={card.id}
                onClick={() => card.link && navigate(`/manager/${card.link}`)}
                className='rounded-2xl border border-gray-100 bg-white/90 p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg'
              >
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>{card.label}</p>
                    <p className='mt-2 text-2xl font-bold text-gray-900'>{card.value}</p>
                    {typeof card.trendValue === 'number' && (
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          card.trendValue >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {`${card.trendValue >= 0 ? '+' : ''}${card.trendValue.toFixed(1)}% vs last period`}
                      </p>
                    )}
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg}`}>
                    {card.icon}
                  </div>
                </div>
                <div className='mt-5 text-sm text-gray-500'>
                  {card.detailLabel && <p>{card.detailLabel}</p>}
                  <p className='font-semibold text-gray-900'>{card.detailValue}</p>
                </div>
                {card.link && <p className='mt-3 text-xs font-semibold text-indigo-500'>View details →</p>}
              </button>
            ))}
          </div>
        ) : (
          <Card className='mb-8 shadow-md'>
            <div className='py-12 text-center text-gray-400'>
              {isLoading ? 'Loading data...' : 'No data available. Please select a different time range.'}
            </div>
          </Card>
        )}

        {/* Performance Metrics */}
        {statistics && (
          <Card
            className='mb-8 shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30'
            title={
              <div className='flex items-center gap-2'>
                <LineChartOutlined className='text-blue-600' />
                <span className='text-lg font-semibold text-gray-800'>Performance Metrics</span>
              </div>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-semibold text-gray-500 uppercase'>Booking Rate</span>
                    <CheckCircleOutlined className='text-green-500' />
                  </div>
                  <p className='text-2xl font-bold text-gray-900'>
                    {statistics.totalBookings > 0 && statistics.totalGroups > 0
                      ? ((statistics.totalBookings / statistics.totalGroups) * 100).toFixed(1)
                      : '0'}
                    %
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {formatCount(statistics.totalBookings)} bookings / {formatCount(statistics.totalGroups)} groups
                  </p>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-semibold text-gray-500 uppercase'>Payment Success</span>
                    <DollarOutlined className='text-emerald-500' />
                  </div>
                  <p className='text-2xl font-bold text-gray-900'>
                    {statistics.totalPayments > 0 && statistics.successfulPayments > 0
                      ? ((statistics.successfulPayments / statistics.totalPayments) * 100).toFixed(1)
                      : '0'}
                    %
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {formatCount(statistics.successfulPayments)} / {formatCount(statistics.totalPayments)} payments
                  </p>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-semibold text-gray-500 uppercase'>Dispute Rate</span>
                    <ExclamationCircleOutlined className='text-amber-500' />
                  </div>
                  <p className='text-2xl font-bold text-gray-900'>
                    {statistics.totalBookings > 0 && statistics.totalDisputes > 0
                      ? ((statistics.totalDisputes / statistics.totalBookings) * 100).toFixed(2)
                      : '0'}
                    %
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {formatCount(statistics.totalDisputes)} disputes / {formatCount(statistics.totalBookings)} bookings
                  </p>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-semibold text-gray-500 uppercase'>Avg Revenue/Group</span>
                    <FundProjectionScreenOutlined className='text-indigo-500' />
                  </div>
                  <p className='text-2xl font-bold text-gray-900'>
                    {statistics.totalGroups > 0 && statistics.totalRevenue
                      ? formatCurrencyCompact(statistics.totalRevenue / statistics.totalGroups)
                      : '0 ₫'}
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {formatCurrencyCompact(statistics.totalRevenue)} total revenue
                  </p>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* Charts Row */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            {/* Pie Chart: Users by Role */}
            <Col xs={24} lg={8}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Users by Role</span>}
              >
                {finalUsersByRoleData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...usersByRolePieConfig} />
                  </div>
                ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <UserOutlined className='text-4xl mb-2 opacity-50' />
                      <p className='text-sm'>No user data available</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            {/* Pie Chart: Groups by Status */}
            <Col xs={24} lg={8}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Groups by Status</span>}
              >
                {groupsByStatusData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...groupsByStatusPieConfig} />
                  </div>
                ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <TeamOutlined className='text-4xl mb-2 opacity-50' />
                      <p className='text-sm'>No group data available</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            {/* Pie Chart: Payment Status */}
            <Col xs={24} lg={8}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Transaction Status</span>}
              >
                {paymentStatusData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...paymentPieConfig} data={paymentStatusData} />
                  </div>
                ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <DollarOutlined className='text-4xl mb-2 opacity-50' />
                      <p className='text-sm'>No transaction data available</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {/* Revenue Trend Line Chart - Full Width */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            <Col xs={24}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Revenue Trend by {getPeriodLabel()}</span>}
              >
                {hasRevenueData && hasPositiveRevenue ? (
                  <div style={{ height: 380 }}>
                    <Line {...lineConfig} />
                  </div>
                ) : hasRevenueData ? (
                  <div className='flex h-[380px] flex-col items-center justify-center gap-3 text-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg'>
                    <LineChartOutlined className='text-5xl text-emerald-500 opacity-60' />
                    <p className='text-base font-semibold text-gray-700'>No revenue in this time period</p>
                    <p className='text-sm text-gray-500 max-w-md'>
                      Try selecting a wider range or another date filter to view revenue data.
                    </p>
                  </div>
                ) : (
                  <div className='flex h-[380px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <LineChartOutlined className='text-5xl mb-3 opacity-50' />
                      <p className='text-sm font-medium'>No revenue data available for this time period</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            <Col xs={24} lg={8}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold'>User Statistics</span>}
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Co-Owners</span>
                      }
                      value={statistics.totalCoOwners}
                      prefix={<UserOutlined className='text-green-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}
                    />
                  </div>
                  <div className='p-4 bg-blue-50 rounded-lg border border-blue-100'>
                    <Statistic
                      title={<span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Staff</span>}
                      value={statistics.totalStaff}
                      prefix={<UserOutlined className='text-blue-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#0284c7' }}
                    />
                  </div>
                  <div className='p-4 bg-purple-50 rounded-lg border border-purple-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Technicians</span>
                      }
                      value={statistics.totalTechnicians}
                      prefix={<UserOutlined className='text-purple-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}
                    />
                  </div>
                  <div className='p-4 bg-red-50 rounded-lg border border-red-100'>
                    <Statistic
                      title={<span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Admins</span>}
                      value={statistics.totalAdmins}
                      prefix={<UserOutlined className='text-red-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}
                    />
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold'>Transaction Statistics</span>}
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div className='p-4 bg-blue-50 rounded-lg border border-blue-100'>
                    <Statistic
                      title={<span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Total</span>}
                      value={statistics.totalPayments}
                      prefix={<DollarOutlined className='text-blue-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#0284c7' }}
                    />
                  </div>
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100'>
                    <Statistic
                      title={<span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Success</span>}
                      value={statistics.successfulPayments}
                      prefix={<CheckCircleOutlined className='text-green-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}
                    />
                  </div>
                  <div className='p-4 bg-yellow-50 rounded-lg border border-yellow-100'>
                    <Statistic
                      title={<span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Pending</span>}
                      value={statistics.pendingPayments}
                      prefix={<ClockCircleOutlined className='text-yellow-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}
                    />
                  </div>
                  <div className='p-4 bg-red-50 rounded-lg border border-red-100'>
                    <Statistic
                      title={<span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Failed</span>}
                      value={statistics.failedPayments}
                      prefix={<CloseCircleOutlined className='text-red-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}
                    />
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold'>Recent Activity (30 Days)</span>}
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>New Users</span>
                      }
                      value={statistics.newUsersLast30Days}
                      prefix={<UserOutlined className='text-green-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}
                    />
                  </div>
                  <div className='p-4 bg-blue-50 rounded-lg border border-blue-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>New Groups</span>
                      }
                      value={statistics.newGroupsLast30Days}
                      prefix={<TeamOutlined className='text-blue-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#0284c7' }}
                    />
                  </div>
                  <div className='p-4 bg-purple-50 rounded-lg border border-purple-100 col-span-2'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>New Contracts</span>
                      }
                      value={statistics.newContractsLast30Days}
                      prefix={<FileTextOutlined className='text-purple-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}
                    />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Operational Overview Section */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            <Col xs={24}>
              <h2 className='text-2xl font-bold text-gray-800 mb-4'>Operational Overview</h2>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-indigo-50'
                styles={{ body: { padding: '28px' } }}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='p-3 rounded-xl bg-blue-100'>
                    <CalendarOutlined className='text-2xl text-blue-600' />
                  </div>
                </div>
                <Statistic
                  title={
                    <span className='text-gray-600 font-medium text-sm uppercase tracking-wide'>Total Bookings</span>
                  }
                  value={statistics.totalBookings || 0}
                  valueStyle={{ color: '#0284c7', fontSize: '32px', fontWeight: '700', lineHeight: '1.2' }}
                />
                <div className='mt-4 pt-4 border-t border-blue-100'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500 font-medium'>Completed</span>
                    <span className='text-sm font-bold text-blue-600'>{statistics.completedBookings || 0}</span>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-orange-50 to-amber-50'
                styles={{ body: { padding: '28px' } }}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='p-3 rounded-xl bg-orange-100'>
                    <WarningOutlined className='text-2xl text-orange-600' />
                  </div>
                </div>
                <Statistic
                  title={<span className='text-gray-600 font-medium text-sm uppercase tracking-wide'>Disputes</span>}
                  value={statistics.totalDisputes || 0}
                  valueStyle={{ color: '#ea580c', fontSize: '32px', fontWeight: '700', lineHeight: '1.2' }}
                />
                <div className='mt-4 pt-4 border-t border-orange-100'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500 font-medium'>Open</span>
                    <span className='text-sm font-bold text-orange-600'>{statistics.disputesByStatus?.OPEN || 0}</span>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-red-50 to-rose-50'
                styles={{ body: { padding: '28px' } }}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='p-3 rounded-xl bg-red-100'>
                    <ExclamationCircleOutlined className='text-2xl text-red-600' />
                  </div>
                </div>
                <Statistic
                  title={<span className='text-gray-600 font-medium text-sm uppercase tracking-wide'>Incidents</span>}
                  value={statistics.totalIncidents || 0}
                  valueStyle={{ color: '#dc2626', fontSize: '32px', fontWeight: '700', lineHeight: '1.2' }}
                />
                <div className='mt-4 pt-4 border-t border-red-100'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500 font-medium'>Pending</span>
                    <span className='text-sm font-bold text-red-600'>{statistics.incidentsByStatus?.PENDING || 0}</span>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-violet-50'
                styles={{ body: { padding: '28px' } }}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='p-3 rounded-xl bg-purple-100'>
                    <ToolOutlined className='text-2xl text-purple-600' />
                  </div>
                </div>
                <Statistic
                  title={
                    <span className='text-gray-600 font-medium text-sm uppercase tracking-wide'>Maintenances</span>
                  }
                  value={statistics.totalMaintenances || 0}
                  valueStyle={{ color: '#7c3aed', fontSize: '32px', fontWeight: '700', lineHeight: '1.2' }}
                />
                <div className='mt-4 pt-4 border-t border-purple-100'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500 font-medium'>In Progress</span>
                    <span className='text-sm font-bold text-purple-600'>
                      {statistics.maintenancesByStatus?.IN_PROGRESS || 0}
                    </span>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Additional Charts Row - Bookings & Contracts */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            <Col xs={24} lg={12}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Bookings by Status</span>}
              >
                {bookingsByStatusData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...bookingsByStatusPieConfig} />
                  </div>
                ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <CalendarOutlined className='text-4xl mb-2 opacity-50' />
                      <p className='text-sm'>No booking data available</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Contracts by Status</span>}
              >
                {contractsByStatusData.length > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie {...contractsByStatusPieConfig} />
                  </div>
                ) : (
                  <div className='flex h-[320px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <FileTextOutlined className='text-4xl mb-2 opacity-50' />
                      <p className='text-sm'>No contract data available</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {/* Financial Overview Section */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            <Col xs={24}>
              <h2 className='text-2xl font-bold text-gray-800 mb-4'>Financial Overview</h2>
            </Col>

            <Col xs={24} lg={16}>
              <Card
                className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                    borderRadius: '8px 8px 0 0'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold text-lg'>Revenue vs Expenses</span>}
              >
                {financialComparisonData.length > 0 ? (
                  <div style={{ height: 300 }}>
                    <Column {...financialComparisonConfig} />
                  </div>
                ) : (
                  <div className='flex h-[300px] items-center justify-center text-gray-400 bg-gray-50 rounded-lg'>
                    <div className='text-center'>
                      <DollarOutlined className='text-4xl mb-2 opacity-50' />
                      <p className='text-sm'>No financial data available</p>
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold'>Fund Information</span>}
              >
                <div className='space-y-4'>
                  <div className='p-4 bg-purple-50 rounded-lg border border-purple-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Total Funds</span>
                      }
                      value={statistics.totalFunds || 0}
                      prefix={<FundProjectionScreenOutlined className='text-purple-600' />}
                      valueStyle={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}
                    />
                  </div>
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>Total Balance</span>
                      }
                      value={formatCurrencyCompact(statistics.totalFundBalance || 0)}
                      prefix={<BankOutlined className='text-green-600' />}
                      valueStyle={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#059669',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    />
                  </div>
                  <div className='p-4 bg-blue-50 rounded-lg border border-blue-100'>
                    <Statistic
                      title={
                        <span className='text-gray-600 text-xs font-medium uppercase tracking-wide'>
                          Total Expenses
                        </span>
                      }
                      value={formatCurrencyCompact(statistics.totalExpenseAmount || 0)}
                      prefix={<ShoppingOutlined className='text-blue-600' />}
                      valueStyle={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#0284c7',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* System Health Section */}
        {statistics && (
          <Row gutter={[24, 24]} className='mb-8'>
            <Col xs={24}>
              <h2 className='text-2xl font-bold text-gray-800 mb-4'>System Health</h2>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold'>Disputes Tracking</span>}
              >
                <div className='grid grid-cols-3 gap-4'>
                  <div className='p-4 bg-orange-50 rounded-lg border border-orange-100 text-center'>
                    <div className='text-2xl font-bold text-orange-600 mb-1'>
                      {statistics.disputesByStatus?.OPEN || 0}
                    </div>
                    <div className='text-xs text-gray-600 font-medium uppercase'>Open</div>
                  </div>
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100 text-center'>
                    <div className='text-2xl font-bold text-green-600 mb-1'>
                      {statistics.disputesByStatus?.RESOLVED || 0}
                    </div>
                    <div className='text-xs text-gray-600 font-medium uppercase'>Resolved</div>
                  </div>
                  <div className='p-4 bg-red-50 rounded-lg border border-red-100 text-center'>
                    <div className='text-2xl font-bold text-red-600 mb-1'>
                      {statistics.disputesByStatus?.REJECTED || 0}
                    </div>
                    <div className='text-xs text-gray-600 font-medium uppercase'>Rejected</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className='h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white'
                styles={{
                  header: {
                    borderBottom: '1px solid #f0f0f0',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, #f5222d 0%, #cf1322 100%)'
                  },
                  body: { padding: '24px' }
                }}
                title={<span className='text-white font-semibold'>Incidents Tracking</span>}
              >
                <div className='grid grid-cols-3 gap-4'>
                  <div className='p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-center'>
                    <div className='text-2xl font-bold text-yellow-600 mb-1'>
                      {statistics.incidentsByStatus?.PENDING || 0}
                    </div>
                    <div className='text-xs text-gray-600 font-medium uppercase'>Pending</div>
                  </div>
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100 text-center'>
                    <div className='text-2xl font-bold text-green-600 mb-1'>
                      {statistics.incidentsByStatus?.APPROVED || 0}
                    </div>
                    <div className='text-xs text-gray-600 font-medium uppercase'>Approved</div>
                  </div>
                  <div className='p-4 bg-red-50 rounded-lg border border-red-100 text-center'>
                    <div className='text-2xl font-bold text-red-600 mb-1'>
                      {statistics.incidentsByStatus?.REJECTED || 0}
                    </div>
                    <div className='text-xs text-gray-600 font-medium uppercase'>Rejected</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  )
}
