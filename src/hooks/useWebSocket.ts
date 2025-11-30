import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { getUserIdFromLS, getAccessTokenFromLS } from '../utils/auth'
import SockJS from 'sockjs-client'
import { Client, type StompSubscription } from '@stomp/stompjs'
import config from '../constants/config'
import { showInfoToast, showSuccessToast, showWarningToast } from '../components/Error'
import { playNotificationSound } from '../utils/sound'

interface WebSocketNotification {
  id: string
  userId: number
  title: string
  message: string
  notificationType: string
  timestamp: string
  priority: string
  data?: Record<string, any>
  actionUrl?: string
  icon?: string
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  initialGroupId?: string
}

interface UseWebSocketResult {
  status: WebSocketStatus
  subscribeToGroupNotifications: (groupId: string) => void
  unsubscribeFromGroupNotifications: (groupId: string) => void
}

const TOAST_CACHE_LIMIT = 50

export function useWebSocket(options?: UseWebSocketOptions): UseWebSocketResult {
  const queryClient = useQueryClient()
  const clientRef = useRef<Client | null>(null)
  const userId = getUserIdFromLS()
  const isConnectedRef = useRef(false)
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const subscriptionsRef = useRef<Map<string, StompSubscription>>(new Map())
  const desiredGroupsRef = useRef<Set<string>>(new Set())
  const seenNotificationIdsRef = useRef<Set<string>>(new Set())
  const pendingInvalidationsRef = useRef<Map<string, QueryKey>>(new Map())
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastStatusRef = useRef<WebSocketStatus>('disconnected')

  const updateStatus = useCallback((next: WebSocketStatus) => {
    setStatus((prev) => {
      if (prev === next) {
        return prev
      }
      return next
    })
  }, [])

  const flushInvalidations = useCallback(() => {
    pendingInvalidationsRef.current.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey })
    })
    pendingInvalidationsRef.current.clear()
    flushTimeoutRef.current = null
  }, [queryClient])

  const enqueueInvalidation = useCallback((queryKey: QueryKey) => {
    const keyString = JSON.stringify(queryKey)
    pendingInvalidationsRef.current.set(keyString, queryKey)
    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(flushInvalidations, 300)
    }
  }, [flushInvalidations])

  const showRealtimeToast = useCallback((notification: WebSocketNotification) => {
    const type = notification.notificationType?.toUpperCase() || ''
    const title = notification.title || 'Thông báo mới'
    const message = notification.message || 'Bạn có thông báo mới'

    playNotificationSound(type)

    if (type.includes('FAILED') || type.includes('REJECT') || type.includes('OVERDUE') || type.includes('CONFLICT')) {
      showWarningToast(message, title)
      return
    }

    if (type.includes('SUCCESS') || type.includes('APPROVED') || type.includes('COMPLETED')) {
      showSuccessToast(message, title)
      return
    }

    showInfoToast(message, title)
  }, [])

  const handleNotification = useCallback((notification: WebSocketNotification) => {
    if (!notification) return

    if (notification.id) {
      if (seenNotificationIdsRef.current.has(notification.id)) {
        return
      }
      seenNotificationIdsRef.current.add(notification.id)
      if (seenNotificationIdsRef.current.size > TOAST_CACHE_LIMIT) {
        const first = seenNotificationIdsRef.current.values().next().value
        seenNotificationIdsRef.current.delete(first)
      }
    }

    enqueueInvalidation(['notifications'])

    const notificationType = notification.notificationType || ''

    if (
      notificationType.includes('PAYMENT') ||
      notificationType.includes('GROUP') ||
      notificationType.includes('CONTRACT') ||
      notificationType.includes('MAINTENANCE')
    ) {
      enqueueInvalidation(['dashboard'])
    }

    if (notificationType.includes('CONTRACT')) {
      enqueueInvalidation(['contracts'])
      enqueueInvalidation(['contractDetail'])
    }

    if (notificationType.includes('GROUP')) {
      enqueueInvalidation(['groups'])
      enqueueInvalidation(['user-ownership'])
    }

    if (notificationType.includes('BOOKING')) {
      enqueueInvalidation(['bookings'])
    }

    if (notificationType.includes('MAINTENANCE')) {
      enqueueInvalidation(['technician', 'myMaintenances'])
    }

    if (notificationType.includes('DOCUMENT') || notificationType.includes('PROFILE')) {
      enqueueInvalidation(['user-profile'])
      enqueueInvalidation(['userProfile'])
    }

    showRealtimeToast(notification)
  }, [enqueueInvalidation, showRealtimeToast])

  const attachGroupSubscription = useCallback((groupId: string) => {
    if (!groupId || !clientRef.current?.connected || subscriptionsRef.current.has(groupId)) {
      return
    }

    const subscription = clientRef.current.subscribe(
      `/topic/group/${groupId}/notifications`,
      (message) => {
        try {
          const notification: WebSocketNotification = JSON.parse(message.body)
          handleNotification(notification)
        } catch (error) {
          console.error('❌ Error parsing group WebSocket message:', error)
        }
      }
    )

    subscriptionsRef.current.set(groupId, subscription)
  }, [handleNotification])

  const subscribeToGroupNotifications = useCallback((groupId: string) => {
    if (!groupId) return
    desiredGroupsRef.current.add(groupId)
    attachGroupSubscription(groupId)
  }, [attachGroupSubscription])

  const unsubscribeFromGroupNotifications = useCallback((groupId: string) => {
    if (!groupId) return
    desiredGroupsRef.current.delete(groupId)
    const subscription = subscriptionsRef.current.get(groupId)
    if (subscription) {
      subscription.unsubscribe()
      subscriptionsRef.current.delete(groupId)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      updateStatus('disconnected')
    }
  }, [userId, updateStatus])

  useEffect(() => {
    if (!userId) {
      return
    }

    // Nếu đã có connection, không tạo mới
    if (isConnectedRef.current && clientRef.current?.connected) {
      return
    }

    // Tạo SockJS client với base URL từ config
    // SockJS cần HTTP URL, không phải WebSocket URL
    const wsUrl = config.baseUrl.replace(/\/$/, '') + '/ws'
    const socket = new SockJS(wsUrl)

    const accessToken = getAccessTokenFromLS()

    const stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      // Thêm token vào STOMP CONNECT headers để authenticate
      connectHeaders: accessToken ? {
        Authorization: `Bearer ${accessToken}`
      } : {},
      debug: (str) => {
        // Chỉ log trong development
        if (import.meta.env.DEV) {
          console.log('STOMP:', str)
        }
      },
      onConnect: () => {
        console.log('✅ WebSocket connected')
        isConnectedRef.current = true
        updateStatus('connected')

        // Subscribe to user-specific notifications
        stompClient.subscribe(
          `/user/${userId}/queue/notifications`,
          (message) => {
            try {
              const notification: WebSocketNotification = JSON.parse(message.body)
              handleNotification(notification)
            } catch (error) {
              console.error('❌ Error parsing WebSocket message:', error)
            }
          }
        )

        // Re-attach any requested group subscriptions
        desiredGroupsRef.current.forEach((groupId) => attachGroupSubscription(groupId))

        if (!desiredGroupsRef.current.size && options?.initialGroupId) {
          subscribeToGroupNotifications(options.initialGroupId)
        }
      },
      onStompError: (frame) => {
        console.error('❌ WebSocket STOMP error:', frame)
        isConnectedRef.current = false
        updateStatus('error')
      },
      onDisconnect: () => {
        console.log('🔌 WebSocket disconnected')
        isConnectedRef.current = false
        updateStatus('disconnected')
        subscriptionsRef.current.forEach((subscription) => subscription.unsubscribe())
        subscriptionsRef.current.clear()
      },
      onWebSocketError: (event) => {
        console.error('❌ WebSocket error:', event)
        isConnectedRef.current = false
        updateStatus('error')
      }
    })

    clientRef.current = stompClient
    updateStatus('connecting')

    // Activate connection
    try {
      stompClient.activate()
    } catch (error) {
      console.error('Failed to activate WebSocket:', error)
    }

    // Cleanup khi unmount
    return () => {
      if (stompClient.connected) {
        stompClient.deactivate()
        isConnectedRef.current = false
      }
      subscriptionsRef.current.forEach((subscription) => subscription.unsubscribe())
      subscriptionsRef.current.clear()
      pendingInvalidationsRef.current.clear()
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = null
      }
    }
  }, [
    userId,
    updateStatus,
    options?.initialGroupId,
    handleNotification,
    attachGroupSubscription,
    subscribeToGroupNotifications
  ])

  // Tự subscribe/unsubscribe theo initialGroupId khi thay đổi
  useEffect(() => {
    if (!options?.initialGroupId) return
    subscribeToGroupNotifications(options.initialGroupId)
    return () => {
      unsubscribeFromGroupNotifications(options.initialGroupId)
    }
  }, [options?.initialGroupId, subscribeToGroupNotifications, unsubscribeFromGroupNotifications])

  useEffect(() => {
    if (lastStatusRef.current === status) return
    if (status === 'connected') {
      showSuccessToast('Đã kết nối realtime', 'Realtime connected')
    } else if (status === 'disconnected') {
      showWarningToast('Realtime tạm thời mất kết nối. Hệ thống sẽ tự thử lại.', 'Realtime disconnected')
    } else if (status === 'error') {
      showWarningToast('Không thể duy trì realtime. Vui lòng kiểm tra mạng.', 'Realtime error')
    }
    lastStatusRef.current = status
  }, [status])

  return {
    status,
    subscribeToGroupNotifications,
    unsubscribeFromGroupNotifications
  }
}

