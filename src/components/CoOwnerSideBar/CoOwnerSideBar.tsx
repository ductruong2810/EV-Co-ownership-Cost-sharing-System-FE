import {
  CarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  FundOutlined,
  QrcodeOutlined,
  TeamOutlined,
  UserOutlined,
  PercentageOutlined,
  CalendarOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import groupApi from '../../apis/group.api'
import path from '../../constants/path'
import type { GroupItem } from '../../types/api/group.type'
import { clearGroupInfoLS } from '../../utils/auth'

export default function CoOwnerSideBar() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const idGroupQuery = useQuery({
    queryKey: ['id-groups', groupId],
    queryFn: () => groupApi.getGroupById(groupId as string),
    enabled: !!groupId
  })

  const contractQuery = useQuery({
    queryKey: ['contracts', groupId],
    queryFn: () => groupApi.getStatusContract(groupId as string),
    enabled: !!groupId
  })

  // useEffect xử lý lỗi khi không có quyền truy cập group nếu admin kick mình ra khỏi group
  useEffect(() => {
    if (contractQuery.error) {
      const error = contractQuery.error as { response?: { status?: number } }
      if (error.response?.status === 403) {
        clearGroupInfoLS()
        navigate(path.dashBoard)
      }
    }
  }, [contractQuery.error, navigate])

  const isApprovalStatus = contractQuery.data?.data?.approvalStatus === 'APPROVED'

  const group: GroupItem = idGroupQuery?.data?.data as GroupItem

  const navItems = [
    { to: `viewGroups/${group?.groupId}/dashboardGroup`, label: 'Group Setup', icon: <CheckCircleOutlined /> },
    { to: `viewGroups/${group?.groupId}/viewMembers`, label: 'Members', icon: <TeamOutlined /> },
    { to: `viewGroups/${group?.groupId}/ownershipPercentage`, label: 'Percentage', icon: <PercentageOutlined /> },
    { to: `viewGroups/${group?.groupId}/ownershipRatio`, label: 'Ownership Ratio', icon: <BarChartOutlined /> },
    { to: `viewGroups/${group?.groupId}/createContract`, label: 'Contract', icon: <FileTextOutlined /> },
    { to: `viewGroups/${group?.groupId}/paymentDeposit`, label: 'Deposit', icon: <DollarOutlined /> }
  ]
  const navApprovedItems = [
    { to: `viewGroups/${group?.groupId}/booking`, label: 'Booking Car', icon: <CarOutlined /> },
    { to: `viewGroups/${group?.groupId}/mybooking`, label: 'My Booking', icon: <CalendarOutlined /> },
    { to: `viewGroups/${group?.groupId}/ownershipRatio`, label: 'Ownership Ratio', icon: <BarChartOutlined /> },
    { to: `viewGroups/${group?.groupId}/check-QR`, label: 'QR Check', icon: <QrcodeOutlined /> },
    { to: `viewGroups/${group?.groupId}/voting`, label: 'Voting', icon: <UserOutlined /> },
    { to: `viewGroups/${group?.groupId}/fund-ownership`, label: 'Fund and deposit', icon: <FundOutlined /> },
    { to: `viewGroups/${group?.groupId}/group-expense`, label: 'Vehicle Billing', icon: <DollarOutlined /> }
  ]

  return (
    <nav className='max-w-4xl mx-auto w-full'>
      <ul className='flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory'>
        {(isApprovalStatus ? navApprovedItems : navItems).map((item, index) => {
          return (
            <li key={index} className='flex-shrink-0 snap-start'>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `
                    inline-flex items-center justify-center gap-1.5 sm:gap-2
                    px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl
                    text-xs font-semibold whitespace-nowrap
                    transition-all duration-300
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2
                    min-w-[85px] sm:min-w-[115px]
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                        : 'bg-gray-50/80 text-gray-700 hover:bg-white hover:text-cyan-600 hover:shadow-md border border-gray-200/80'
                    }
                  `.trim()
                }
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span className={`text-sm sm:text-base transition-colors flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                      {item.icon}
                    </span>
                    <span className='hidden sm:inline truncate max-w-[80px]'>{item.label}</span>
                    <span className='sm:hidden truncate max-w-[50px]'>{item.label.split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
