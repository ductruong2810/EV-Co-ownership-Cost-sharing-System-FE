import {
  BellOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  LogoutOutlined,
  TransactionOutlined,
  UserOutlined
} from '@ant-design/icons'
import { Space, Modal, Avatar as AvatarIcon } from 'antd'
import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import path from '../../constants/path'
import useCustomFloating from '../../hooks/useCustomFloating'
import formatTimeAgo from '../../utils/caculatimeNotification'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import authApi from '../../apis/auth.api'
import { clearLS, getAccessTokenFromLS, getEmailAccountFromLS, getUserIdFromLS } from '../../utils/auth'
import { AppContext } from '../../contexts/app.context'
import { showSuccessToast } from '../Error'
import classNames from 'classnames'
import type { GetAllNotifications } from '../../types/api/user.type'
import userApi from '../../apis/user.api'
import Skeleton from '../Skeleton'
import Avatar from '../../pages/MyAccount/Components/Avatar/Avatar'
import type { WebSocketStatus } from '../../hooks/useWebSocket'

function NavHeader() {
  const userId = getUserIdFromLS()

  // language state
  const [lang, setLang] = useState('English')
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [enableNotificationScroll, setEnableNotificationScroll] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<GetAllNotifications | null>(null)

  // global state from context
  const { setIsAuthenticated, websocketStatus } = useContext(AppContext)

  const statusStyles: Record<WebSocketStatus, { label: string; color: string }> = {
    connected: { label: 'Realtime online', color: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' },
    connecting: { label: 'Đang kết nối realtime...', color: 'bg-amber-400 animate-pulse' },
    disconnected: { label: 'Realtime offline', color: 'bg-gray-400' },
    error: { label: 'Realtime error', color: 'bg-red-500 animate-pulse' }
  }
  const currentStatusStyle = statusStyles[websocketStatus] || statusStyles.disconnected

  const queryClient = useQueryClient()

  //call api get user profile để lấy fullName
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userApi.getProfile().then((res) => res.data),
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    refetchOnWindowFocus: false
  })

  //call api get all notification
  const { data: notifications = [], isPending } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => userApi.getAllNotification().then((res) => res.data),
    staleTime: 10000,
    refetchOnWindowFocus: false
  })

  // call api dùng để đánh dấu đã đọc notification khi bấm vào notification
  const readNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => userApi.readNotification(notificationId.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      console.error('Failed to mark notification as read', error)
    }
  })

  const handleSetState = (func: React.Dispatch<React.SetStateAction<boolean>>) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    func((prev) => !prev)
  }

  //count những notification chưa đọc
  const notificationCount = notifications.filter((n) => !n.isRead).length
  //mặc định lấy 5 thằng đầu tiên
  const getDisplayedNotifications = () => (enableNotificationScroll ? notifications : notifications.slice(0, 5))

  // floating account
  const { refs: accountRefs, floatingStyles: accountFloatingStyles } = useCustomFloating({
    open: isAccountOpen,
    setOpen: setIsAccountOpen,
    placement: 'bottom-end'
  })

  // floating notification
  const { refs: notificationRefs, floatingStyles: notificationFloatingStyles } = useCustomFloating({
    open: isNotificationOpen,
    setOpen: setIsNotificationOpen,
    placement: 'bottom-start'
  })

  // logout
  const logoutMutation = useMutation({
    mutationFn: authApi.logout
  })

  //func giúp có thể logout
  const handleLogout = () => {
    const accessToken = getAccessTokenFromLS()
    logoutMutation.mutate(accessToken, {
      onSuccess: () => {
        // Hiển thị toast TRƯỚC khi redirect
        showSuccessToast('You have been logged out successfully. See you again!', 'Logout Successful')
        
        // Delay redirect để user thấy toast
        setTimeout(() => {
          setIsAuthenticated(false)
          clearLS()
        }, 500) // 500ms delay để toast hiển thị
      }
    })
  }

  // notification modal click
  const handleNotificationClick = ({
    notification,
    notificationId
  }: {
    notification: GetAllNotifications
    notificationId: number
  }) => {
    setSelectedNotification(notification)
    readNotificationMutation.mutate(notificationId)
    setIsModalOpen(true)
  }

  return isPending ? (
    <Skeleton />
  ) : (
    <div className='flex items-center gap-2 sm:gap-4'>
      <div
        className='hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200/80 bg-gradient-to-r from-white to-gray-50/80 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm'
        title={currentStatusStyle.label}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${currentStatusStyle.color} animate-pulse`} />
        <span className='text-xs font-semibold text-gray-700'>{currentStatusStyle.label}</span>
      </div>
      {/* Notification */}
      <div onMouseEnter={() => setIsNotificationOpen(true)} onMouseLeave={() => setIsNotificationOpen(false)}>
        <div ref={notificationRefs.setReference} className='relative'>
          <div className='p-2 rounded-lg hover:bg-teal-50/50 transition-all duration-300 cursor-pointer group'>
            <BellOutlined className='text-xl sm:text-2xl text-gray-700 group-hover:text-teal-500 transition-all duration-300 group-hover:scale-110' />
          </div>
          {notificationCount > 0 && (
            <span className='absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg animate-pulse border-2 border-white'>
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>

        {isNotificationOpen && (
          <div
            ref={notificationRefs.setFloating}
            style={notificationFloatingStyles}
            className='bg-white rounded-xl shadow-2xl border border-gray-200/80 py-2 min-w-[300px] max-w-[400px] z-50 backdrop-blur-sm
                   before:content-[""] before:absolute before:-top-6 before:left-0 before:right-0 before:h-6'
          >
            {notifications.length > 0 && (
              <div
                className={`transition-all duration-500 ease-in-out ${
                  enableNotificationScroll
                    ? 'max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
                    : 'max-h-[400px]'
                }`}
              >
                {getDisplayedNotifications().map((notification) => (
                  <div
                    key={notification.id.toString()}
                    onClick={() =>
                      handleNotificationClick({
                        notification: notification,
                        notificationId: notification.id
                      })
                    }
                    className={`px-4 py-3 hover:bg-gray-300 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                      !notification.isRead ? 'bg-blue-50 text-gray-900' : 'text-gray-800'
                    }`}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='text-sm font-medium truncate flex-1 min-w-0 max-w-[220px] overflow-hidden'>
                        {notification.message}
                      </div>
                      {!notification.isRead && (
                        <div className='w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0'></div>
                      )}
                    </div>
                    <div className='text-xs text-gray-500 mt-1'>{formatTimeAgo(new Date(notification.createdAt))}</div>
                  </div>
                ))}
                {notifications.length > 5 && !enableNotificationScroll && (
                  <div className='px-4 py-2 text-center border-t border-gray-200 bg-gray-50'>
                    <button
                      onClick={handleSetState(setEnableNotificationScroll)}
                      className='text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors'
                    >
                      View {notifications.length - 5} more notifications
                    </button>
                  </div>
                )}
                {enableNotificationScroll && notifications.length > 5 && (
                  <div className='px-4 py-2 text-center border-t border-gray-200 bg-gray-50'>
                    <button
                      onClick={handleSetState(setEnableNotificationScroll)}
                      className='text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors'
                    >
                      Show less
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification detail Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        title={
          <div className='flex items-center gap-2'>
            <BellOutlined className='text-teal-500 text-xl' />
            <span className='text-lg font-bold text-teal-700'>Notification details</span>
          </div>
        }
        className='custom-notification-modal'
        style={{
          borderRadius: '18px'
        }}
      >
        <div className='modal-body p-6 bg-gradient-to-br from-teal-50 to-white rounded-lg'>
          <div className='text-base font-semibold mb-2 text-gray-900'>{selectedNotification?.message || ''}</div>
          <div className='text-xs text-gray-500 mb-3'>
            {selectedNotification ? formatTimeAgo(new Date(selectedNotification.createdAt)) : ''}
          </div>
        </div>
      </Modal>

      {/* Account */}
      <div onMouseEnter={handleSetState(setIsAccountOpen)} onMouseLeave={handleSetState(setIsAccountOpen)}>
        <div ref={accountRefs.setReference}>
          <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-teal-50/50 transition-all duration-300 cursor-pointer group'>
            <div className='relative'>
              <AvatarIcon
                className='text-xl sm:text-2xl text-gray-600 group-hover:text-teal-500 transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-teal-100 group-hover:to-cyan-100'
                icon={<UserOutlined />}
              />
            </div>
            <span className='hidden sm:inline-block text-sm font-semibold text-gray-700 group-hover:text-teal-600 truncate max-w-[120px] transition-colors duration-300'>
              {userProfile?.fullName || getEmailAccountFromLS()}
            </span>
          </div>
        </div>

        {isAccountOpen && (
          <div
            ref={accountRefs.setFloating}
            style={accountFloatingStyles}
            className='bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl shadow-2xl border border-gray-200/50 py-3 min-w-[220px] ml-10 z-[60] 
                 before:content-[""]  before:absolute before:-top-6 before:left-0 before:right-0 before:h-6 backdrop-blur-sm'
          >
            {/* Header with user info */}
            <div className='px-4 py-3 border-b border-gray-200/70 bg-gradient-to-r from-blue-50 to-indigo-50'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
                  <Avatar userId={userId} size={40} className='cursor-pointer' />
                </div>
                <div>
                  <div className='text-sm font-semibold text-gray-800'>{userProfile?.fullName || getEmailAccountFromLS()}</div>
                  <div className='text-xs text-gray-500'>{userProfile?.email || 'Member'}</div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className='py-2'>
              <div className='px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 text-gray-700 font-medium group'>
                <Link to={path.profile} className='flex items-center gap-3'>
                  <UserOutlined className='text-blue-500 group-hover:text-blue-600 transition-colors' />
                  <span className='group-hover:text-blue-600 transition-colors'>My Account</span>
                </Link>
              </div>

              <div className='px-4 py-3 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 cursor-pointer transition-all duration-200 text-gray-700 font-medium group'>
                <Link to={path.uploadLicense} className='flex items-center gap-3'>
                  <SafetyCertificateOutlined className='text-green-500 group-hover:text-green-600 transition-colors' />
                  <span className='group-hover:text-green-600 transition-colors'>
                    Update Driver License & Citizen ID
                  </span>
                </Link>
              </div>

              <div className='px-4 py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200 text-gray-700 font-medium group'>
                <Link to={path.paymentHistory} className='flex items-center gap-3'>
                  <TransactionOutlined className='text-purple-500 group-hover:text-purple-600 transition-colors' />
                  <span className='group-hover:text-purple-600 transition-colors'>Payment history</span>
                </Link>
              </div>

              <div className='px-4 py-3 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-yellow-100 cursor-pointer transition-all duration-200 text-gray-700 font-medium group'>
                <Link to={path.changePassword} className='flex items-center gap-3'>
                  <LockOutlined className='text-orange-500 group-hover:text-orange-600 transition-colors' />
                  <span className='group-hover:text-orange-600 transition-colors'>Change password</span>
                </Link>
              </div>
            </div>

            <div className='border-t border-gray-200/70 mt-2'>
              <div className='px-4 py-3 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 cursor-pointer transition-all duration-200 text-gray-700 font-medium group'>
                <div
                  onClick={handleLogout}
                  className={classNames({
                    'flex items-center gap-3 cursor-not-allowed pointer-events-none': logoutMutation.isPending,
                    'flex items-center gap-3 ': !logoutMutation.isPending
                  })}
                >
                  <LogoutOutlined className='text-red-500 group-hover:text-red-600 transition-colors' />
                  <span className='group-hover:text-red-600 transition-colors'>Logout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language */}
      <div
        className='hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-teal-50/50 transition-all duration-300 cursor-pointer group'
        onClick={() => setLang((prev) => (prev === 'English' ? 'Tiếng Việt' : 'English'))}
      >
        <GlobalOutlined className='text-xl sm:text-2xl text-gray-600 group-hover:text-teal-500 transition-all duration-300 group-hover:scale-110' />
        <span className='text-gray-700 group-hover:text-teal-600 font-medium w-20 sm:w-24 inline-block text-sm transition-colors duration-300'>
          {lang}
        </span>
      </div>
    </div>
  )
}

export default NavHeader
