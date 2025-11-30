import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  IdcardOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileTextOutlined,
  EditOutlined,
  UserAddOutlined,
  ToolOutlined,
  CarOutlined,
  SettingOutlined,
  AlertOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import { getRoleFromLS } from '../../utils/auth'
import path from '../../constants/path'
import logger from '../../utils/logger'
import CheckLicenseModal from './pages/CheckLicense/CheckLicenseModal'

export default function AdminDashboard() {
  const role = getRoleFromLS()
  const location = useLocation()
  const [periodType, setPeriodType] = useState<string>('DAY')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [scrollY, setScrollY] = useState<number>(0)
  const [checkLicenseModalOpen, setCheckLicenseModalOpen] = useState<boolean>(false)
  const roleLabel = useMemo(() => {
    switch (role) {
      case 'ADMIN':
        return 'Admin Console'
      case 'STAFF':
        return 'Staff Workspace'
      case 'TECHNICIAN':
        return 'Technician Panel'
      default:
        return 'Management'
    }
  }, [role])
  
  // Check if we're on dashboard page (index route or /dashboard)
  const isDashboardPage = location.pathname === '/manager' || 
                          location.pathname === '/manager/' || 
                          location.pathname.includes('/manager/dashboard')
  
  // Check if we're on dashboard page and get periodType from localStorage
  useEffect(() => {
    const isDashboard = location.pathname.includes('/dashboard') || 
                       location.pathname === '/manager' || 
                       location.pathname === '/manager/'
    if (isDashboard) {
      const storedPeriodType = localStorage.getItem('dashboardPeriodType') || 'DAY'
      setPeriodType(storedPeriodType)
      
      // Listen for storage changes (when Dashboard component updates periodType)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'dashboardPeriodType' && e.newValue) {
          setPeriodType(e.newValue)
        }
      }
      window.addEventListener('storage', handleStorageChange)
      
      // Also listen for custom event (same-origin updates)
      const handleCustomStorageChange = () => {
        const updatedPeriodType = localStorage.getItem('dashboardPeriodType') || 'DAY'
        setPeriodType(updatedPeriodType)
      }
      window.addEventListener('periodTypeChanged', handleCustomStorageChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('periodTypeChanged', handleCustomStorageChange)
      }
    }
  }, [location.pathname])

  // Track scroll position for sidebar animation
  useEffect(() => {
    const mainContent = document.querySelector('main')
    if (!mainContent) return

    const handleScroll = () => {
      setScrollY(mainContent.scrollTop)
    }

    mainContent.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      mainContent.removeEventListener('scroll', handleScroll)
    }
  }, [location.pathname]) // Re-run when route changes to find new main element
  
  // Get period label
  const getPeriodLabel = (type: string) => {
    switch (type) {
      case 'DAY':
        return 'By Day'
      case 'WEEK':
        return 'By Week'
      case 'MONTH':
        return 'By Month'
      default:
        return 'By Day'
    }
  }
  
  logger.debug('Admin Dashboard - Current role:', role)
  return (
    <div className='flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } transition-all duration-300 ease-in-out bg-white border-r border-gray-200 relative ${
          scrollY > 20 
            ? 'shadow-2xl sticky top-0 h-screen z-40' 
            : 'shadow-xl'
        }`}
        style={{
          transform: scrollY > 20 ? 'translateY(0)' : 'translateY(0)',
          transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out'
        }}
        aria-label='Sidebar'
      >
        {/* Toggle Button - Always visible at top of sidebar */}
        <div className='absolute top-4 right-2 z-50'>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className='p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-all duration-200 text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-blue-400'
            aria-label='Toggle sidebar'
          >
            {sidebarCollapsed ? (
              <MenuUnfoldOutlined className='text-lg' />
            ) : (
              <MenuFoldOutlined className='text-lg' />
            )}
          </button>
        </div>

        <div className='flex h-full flex-col overflow-y-auto py-4 px-4'>
          {/* Header */}
          <div className='flex items-center justify-between mb-6 px-2 pt-10'>
            {!sidebarCollapsed && (
              <div className='space-y-0.5'>
                <p className='text-xs font-semibold tracking-wide text-gray-400 uppercase'>
                  {role === 'ADMIN' ? 'System Admin' : role === 'STAFF' ? 'Back Office' : role === 'TECHNICIAN' ? 'Operations' : 'Dashboard'}
                </p>
                <h2 className='text-lg font-bold text-gray-800'>{roleLabel}</h2>
              </div>
            )}
          </div>
          <ul className='space-y-1'>
            {role === 'ADMIN' && (
              <>
                {/* Dashboard - Most important, at the top */}
                <li>
                  <NavLink
                    to='dashboard'
                    end={false}
                    className={({ isActive }) => {
                      // Dashboard should be active on index route (/manager) or /dashboard route
                      const shouldBeActive = isActive || isDashboardPage
                      
                      const activeClass = shouldBeActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200 relative`
                    }}
                  >
                    {({ isActive }) => {
                      const shouldBeActive = isActive || isDashboardPage
                      
                      return (
                        <>
                          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
                            <DashboardOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                            {!sidebarCollapsed && <span>Dashboard</span>}
                          </div>
                          {!sidebarCollapsed && shouldBeActive && isDashboardPage && (
                            <span className='ml-2 px-2.5 py-1 text-xs font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full shadow-sm border border-white/30'>
                              {getPeriodLabel(periodType)}
                            </span>
                          )}
                        </>
                      )
                    }}
                  </NavLink>
                </li>
                <div className='h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3'></div>
              </>
            )}

            {(role === 'ADMIN' || role === 'STAFF') && (
              <div>
                {/* Review & Verification Section */}
                {!sidebarCollapsed && (
                  <p className='px-2 mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase'>
                    Review & Verification
                  </p>
                )}
                <li>
                  <NavLink
                    to='groups'
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <TeamOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Groups</span>}
                      </>
                    )}
                  </NavLink>
                </li>
                <li>
                  <button
                    onClick={() => setCheckLicenseModalOpen(true)}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} w-full rounded-lg text-gray-700 hover:bg-gray-100 ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`}
                  >
                    <IdcardOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && <span>Documents</span>}
                  </button>
                </li>
                <li>
                  <NavLink
                    to={path.checkBooking}
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <CalendarOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Bookings</span>}
                      </>
                    )}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={path.disputes}
                    className={({ isActive }) => {
                      const activeClass = isActive
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${
                        sidebarCollapsed ? 'p-3' : 'p-3'
                      } text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <AlertOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Disputes</span>}
                      </>
                    )}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={path.financialReports}
                    className={({ isActive }) => {
                      const activeClass = isActive
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${
                        sidebarCollapsed ? 'p-3' : 'p-3'
                      } text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <FileTextOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Financial Reports</span>}
                      </>
                    )}
                  </NavLink>
                </li>
                <div className='h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3'></div>
              </div>
            )}

            {role === 'ADMIN' && (
              <>
                {/* Contract Management Section */}
                {!sidebarCollapsed && (
                  <p className='px-2 mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase'>
                    Contracts & Team
                  </p>
                )}
                <li>
                  <NavLink
                    to='checkContract'
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200 mb-1`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <FileTextOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Contracts</span>}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to='editContract'
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <EditOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Edit Contract</span>}
                      </>
                    )}
                  </NavLink>
                </li>
                <div className='h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3'></div>
                
                {/* User Management Section */}
                <li>
                  <NavLink
                    to='createStaff'
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200 mb-1`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <UserAddOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Add Staff</span>}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to='createTechnician'
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <ToolOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Add Technician</span>}
                      </>
                    )}
                  </NavLink>
                </li>
                <div className='h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3'></div>
                {/* System & Audit Section */}
                {!sidebarCollapsed && (
                  <p className='px-2 mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase'>
                    System & Audit
                  </p>
                )}
                <li>
                  <NavLink
                    to='auditLogs'
                    className={({ isActive }) => {
                      const activeClass = isActive
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${
                        sidebarCollapsed ? 'p-3' : 'p-3'
                      } text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <HistoryOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Audit Logs</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              </>
            )}

            {role === 'TECHNICIAN' && (
              <li>
                {!sidebarCollapsed && (
                  <p className='px-2 mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase'>
                    Technician Tools
                  </p>
                )}
                <NavLink
                  to='checkVehicleReport'
                  className={({ isActive }) => {
                    const activeClass = isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                    return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${
                      sidebarCollapsed ? 'p-3' : 'p-3'
                    } text-sm font-medium transition-all duration-200 mb-1`
                  }}
                >
                  {() => (
                    <>
                      <CarOutlined
                        className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${
                          sidebarCollapsed ? '' : 'mr-3'
                        }`}
                      />
                      {!sidebarCollapsed && <span>Vehicle Reports</span>}
                    </>
                  )}
                </NavLink>
                <NavLink
                  to='maintenance'
                  className={({ isActive }) => {
                    const activeClass = isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                    return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${
                      sidebarCollapsed ? 'p-3' : 'p-3'
                    } text-sm font-medium transition-all duration-200`
                  }}
                >
                  {() => (
                    <>
                      <SettingOutlined
                        className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${
                          sidebarCollapsed ? '' : 'mr-3'
                        }`}
                      />
                      {!sidebarCollapsed && <span>Maintenance</span>}
                    </>
                  )}
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : ''} overflow-y-auto`}>
        <div className='h-full py-6 px-6'>
          <Outlet />
        </div>
      </main>

      {/* Check License Modal */}
      <CheckLicenseModal 
        open={checkLicenseModalOpen} 
        onClose={() => setCheckLicenseModalOpen(false)} 
      />
    </div>
  )
}
