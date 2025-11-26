import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getUserIdFromLS, getAccessTokenFromLS } from '../utils/auth'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import config from '../constants/config'

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

/**
 * WebSocket hook để kết nối và nhận realtime notifications
 * Tự động invalidate React Query khi nhận updates
 */
export function useWebSocket() {
  const queryClient = useQueryClient()
  const clientRef = useRef<Client | null>(null)
  const userId = getUserIdFromLS()
  const isConnectedRef = useRef(false)

  useEffect(() => {
    if (!userId) return

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

        // Subscribe to user-specific notifications
        stompClient.subscribe(
          `/user/${userId}/queue/notifications`,
          (message) => {
            try {
              const notification: WebSocketNotification = JSON.parse(message.body)
              console.log('📨 Received notification:', notification)

              // Invalidate notifications query để refresh danh sách
              queryClient.invalidateQueries({ queryKey: ['notifications'] })

              // Invalidate các queries liên quan dựa trên notification type
              const notificationType = notification.notificationType || ''

              // Dashboard updates
              if (
                notificationType.includes('PAYMENT') ||
                notificationType.includes('GROUP') ||
                notificationType.includes('CONTRACT') ||
                notificationType.includes('MAINTENANCE')
              ) {
                queryClient.invalidateQueries({ queryKey: ['dashboard'] })
              }

              // Contract updates
              if (notificationType.includes('CONTRACT')) {
                queryClient.invalidateQueries({ queryKey: ['contracts'] })
                queryClient.invalidateQueries({ queryKey: ['contractDetail'] })
              }

              // Group updates
              if (notificationType.includes('GROUP')) {
                queryClient.invalidateQueries({ queryKey: ['groups'] })
                queryClient.invalidateQueries({ queryKey: ['user-ownership'] })
              }

              // Booking updates
              if (notificationType.includes('BOOKING')) {
                queryClient.invalidateQueries({ queryKey: ['bookings'] })
              }

              // Maintenance updates
              if (notificationType.includes('MAINTENANCE')) {
                queryClient.invalidateQueries({ queryKey: ['technician', 'myMaintenances'] })
              }

              // User profile updates
              if (notificationType.includes('DOCUMENT') || notificationType.includes('PROFILE')) {
                queryClient.invalidateQueries({ queryKey: ['user-profile'] })
                queryClient.invalidateQueries({ queryKey: ['userProfile'] })
              }
            } catch (error) {
              console.error('❌ Error parsing WebSocket message:', error)
            }
          }
        )

        // Subscribe to group notifications nếu có groupId
        // Có thể subscribe động khi user vào group page
      },
      onStompError: (frame) => {
        console.error('❌ WebSocket STOMP error:', frame)
        isConnectedRef.current = false
      },
      onDisconnect: () => {
        console.log('🔌 WebSocket disconnected')
        isConnectedRef.current = false
      },
      onWebSocketError: (event) => {
        console.error('❌ WebSocket error:', event)
        isConnectedRef.current = false
      }
    })

    clientRef.current = stompClient
    
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
    }
  }, [userId, queryClient])

  return clientRef.current
}

