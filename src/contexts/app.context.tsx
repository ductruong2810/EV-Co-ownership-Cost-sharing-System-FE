/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useMemo } from 'react'
import {
  getAccessTokenFromLS,
  getEmailAccountFromLS,
  getGroupIdFromLS,
  getRoleFromLS,
  getUserIdFromLS,
  setUserIdToLS,
  LocalStorageEventTarget,
  GROUP_ID_CHANGED_EVENT
} from '../utils/auth'
import { useWebSocket, type WebSocketStatus } from '../hooks/useWebSocket'
import { getUserIdFromToken } from '../utils/tokenUtils'

// Định nghĩa context lưu dữ liệu kiểu gì hoặc nói cách khác là định nghĩa cho initialState
interface AppContextInterface {
  isAuthenticated: boolean
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
  reset: () => void
  emailAccount: string
  setEmailAccount: React.Dispatch<React.SetStateAction<string>>
  role: string
  setRole: React.Dispatch<React.SetStateAction<string>>
  groupId: string
  setGroupId: React.Dispatch<React.SetStateAction<string>>
  userId: string
  setUserId: React.Dispatch<React.SetStateAction<string>>
  websocketStatus: WebSocketStatus
  subscribeGroupNotifications: (groupId: string) => void
  unsubscribeGroupNotifications: (groupId: string) => void
}

// initialState giúp coi ban đầu sẽ lưu gì
const initialAppContext: AppContextInterface = {
  // Nếu lấy ra được access_token thì sẽ là true, còn là '' thì ép kiểu về false
  isAuthenticated: Boolean(getAccessTokenFromLS()),
  setIsAuthenticated: () => null,
  reset: () => null,
  emailAccount: getEmailAccountFromLS(),
  setEmailAccount: () => null,
  role: getRoleFromLS(),
  setRole: () => null,
  groupId: getGroupIdFromLS(),
  setGroupId: () => null,
  userId: getUserIdFromLS(),
  setUserId: () => null,
  websocketStatus: 'disconnected',
  subscribeGroupNotifications: () => undefined,
  unsubscribeGroupNotifications: () => undefined
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextInterface>(initialAppContext)

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAppContext.isAuthenticated)
  const [emailAccount, setEmailAccount] = useState<string>(initialAppContext.emailAccount)
  const [role, setRole] = useState<string>(initialAppContext.role)
  const [userId, setUserId] = useState<string>(initialAppContext.userId)

  // thêm state groupId
  const [groupId, setGroupId] = useState<string>(initialAppContext.groupId)

  const websocketOptions = useMemo(() => {
    const options = { 
      initialGroupId: groupId || undefined,
      userId: userId || undefined // Pass userId to trigger WebSocket connection when it changes
    }
    console.log('📡 AppContext: WebSocket options updated:', { userId: options.userId, groupId: options.initialGroupId })
    return options
  }, [groupId, userId])
  const {
    status: websocketStatus,
    subscribeToGroupNotifications,
    unsubscribeFromGroupNotifications
  } = useWebSocket(websocketOptions)

  // Extract userId from token if not in localStorage (for users who logged in before this fix)
  useEffect(() => {
    const storedUserId = getUserIdFromLS()
    if (!storedUserId && isAuthenticated) {
      const userIdFromToken = getUserIdFromToken()
      if (userIdFromToken) {
        setUserIdToLS(userIdFromToken)
        setUserId(userIdFromToken)
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleGroupIdChange = (event: Event) => {
      const newGroupId = (event as CustomEvent<string>).detail || ''
      setGroupId(newGroupId)
    }

    LocalStorageEventTarget.addEventListener(GROUP_ID_CHANGED_EVENT, handleGroupIdChange)
    return () => {
      LocalStorageEventTarget.removeEventListener(GROUP_ID_CHANGED_EVENT, handleGroupIdChange)
    }
  }, [])

  const reset = () => {
    setIsAuthenticated(false)
    // reset luôn group khi logout
    setGroupId('')
  }

  // Nếu không có value thì nó sẽ lấy inititalAppContext
  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        reset,
        emailAccount,
        setEmailAccount,
        role,
        setRole,
        groupId,
        setGroupId,
        userId,
        setUserId,
        websocketStatus,
        subscribeGroupNotifications: subscribeToGroupNotifications,
        unsubscribeGroupNotifications: unsubscribeFromGroupNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
