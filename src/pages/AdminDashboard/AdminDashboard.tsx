import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
  AlertOutlined
} from '@ant-design/icons'
import { getRoleFromLS } from '../../utils/auth'
import path from '../../constants/path'
import logger from '../../utils/logger'

export default function AdminDashboard() {
  const role = getRoleFromLS()
  const location = useLocation()
  const [periodType, setPeriodType] = useState<string>('DAY')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  
  // Check if we're on dashboard page and get periodType from localStorage
  useEffect(() => {
    const isDashboard = location.pathname.includes('/dashboard')
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
  
  const isDashboardPage = location.pathname.includes('/dashboard')
  
  logger.debug('Admin Dashboard - Current role:', role)
  return (
    <div className='flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } transition-all duration-300 ease-in-out bg-white shadow-xl border-r border-gray-200 relative`}
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
              <h2 className='text-lg font-bold text-gray-800'>Admin Menu</h2>
            )}
          </div>
          <ul className='space-y-1'>
            {role === 'ADMIN' && (
              <>
                {/* Dashboard - Most important, at the top */}
                <li>
                  <NavLink
                    to='dashboard'
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200 relative`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
                          <DashboardOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                          {!sidebarCollapsed && <span>Dashboard</span>}
                        </div>
                        {!sidebarCollapsed && isActive && isDashboardPage && (
                          <span className='ml-2 px-2.5 py-1 text-xs font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full shadow-sm border border-white/30'>
                            {getPeriodLabel(periodType)}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
                <div className='h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3'></div>
              </>
            )}

            {(role === 'ADMIN' || role === 'STAFF') && (
              <div>
                {/* Review & Verification Section */}
                <li>
                  <NavLink
                    to=''
                    end
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
                  <NavLink
                    to={path.checkLicense}
                    className={({ isActive }) => {
                      const activeClass = isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                      return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <IdcardOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && <span>Documents</span>}
                      </>
                    )}
                  </NavLink>
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
                <div className='h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3'></div>
              </div>
            )}

            {role === 'ADMIN' && (
              <>
                {/* Contract Management Section */}
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
              </>
            )}

            {role === 'TECHNICIAN' && (
              <li>
                <NavLink
                  to='checkVehicleReport'
                  className={({ isActive }) => {
                    const activeClass = isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100'
                    return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200 mb-1`
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <CarOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                      {!sidebarCollapsed && <span>Reports</span>}
                    </>
                  )}
                </NavLink>
                <NavLink
                  to='maintenance'
                  className={({ isActive }) => {
                    const activeClass = isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100'
                    return `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} rounded-lg ${activeClass} ${sidebarCollapsed ? 'p-3' : 'p-3'} text-sm font-medium transition-all duration-200`
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <SettingOutlined className={`${sidebarCollapsed ? 'text-lg' : 'text-base'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
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
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : ''}`}>
        <div className='h-full py-6 px-6'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
