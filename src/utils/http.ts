import axios, { AxiosError, HttpStatusCode, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import config from '../constants/config'
import { clearLS, getAccessTokenFromLS, getRefreshTokenFromLS, setAccessTokenToLS, setRefreshTokenToLS } from './auth'
import { logError, convertToErrorInfo } from './errorHandler'
import { showErrorToast } from '../components/Error/ErrorToast'
import { ErrorSeverity } from '../types/error.type'
import logger from './logger'
import authApi from '../apis/auth.api'

class Http {
  instance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  }> = []
  // Track consecutive network errors to detect backend down
  private consecutiveNetworkErrors = 0
  private lastNetworkErrorTime: number | null = null
  private readonly MAX_NETWORK_ERRORS = 5 // Clear token after 5 consecutive network errors
  private readonly NETWORK_ERROR_WINDOW = 30000 // 30 seconds window

  constructor() {
    this.instance = axios.create({
      baseURL: config.baseUrl,
      timeout: 60000, // 60 giây - tăng timeout cho Render (có thể chậm do cold start)
      headers: {
        'Content-Type': 'application/json'
      }
    })
    // thêm interceptor để gắn accessToken vào header Authorization
    // interceptor request là trước khi request được gửi đi chạy vào đây kiểm tra
    this.instance.interceptors.request.use(
      // config là cấu hình của request sắp được gửi đi toàn bộ thông tin chi tiết về request

      (config) => {
        const accessToken = getAccessTokenFromLS()
        // nếu có accessToken thì gắn vào header Authorization
        // this.accessToken  có token để gửi đi không
        // config.headers có tồn tại header  trong request không
        if (accessToken && config.headers) {
          config.headers['Authorization'] = `Bearer ${accessToken}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
    // Response Interceptor - xử lý lỗi 401 het accesstoken
    this.instance.interceptors.response.use(
      (response) => {
        // Reset network error counter on successful response
        this.consecutiveNetworkErrors = 0
        this.lastNetworkErrorTime = null
        return response
      },
      (error: AxiosError) => {
        // Log error for debugging
        logError(error, 'HTTP Request')
        
        // Log chi tiết để debug
        logger.debug('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method
        })

        // Detect network errors (no response = backend down or network issue)
        const isNetworkError = !error.response && (
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK' ||
          error.message?.includes('Network Error') ||
          error.message?.includes('timeout')
        )

        // Track consecutive network errors
        if (isNetworkError) {
          const now = Date.now()
          
          // Reset counter if last error was too long ago
          if (this.lastNetworkErrorTime && now - this.lastNetworkErrorTime > this.NETWORK_ERROR_WINDOW) {
            this.consecutiveNetworkErrors = 1
          } else {
            this.consecutiveNetworkErrors++
          }
          
          this.lastNetworkErrorTime = now

          // If too many consecutive network errors, clear token and redirect to login
          // This prevents user from being stuck with invalid token when backend is down
          if (this.consecutiveNetworkErrors >= this.MAX_NETWORK_ERRORS) {
            logger.warn(`Backend appears to be down. ${this.consecutiveNetworkErrors} consecutive network errors. Clearing token and redirecting to login.`)
            clearLS()
            
            // Only redirect if not already on login page
            if (window.location.pathname !== '/login') {
              // Show error toast before redirect
              showErrorToast({
                type: 'NETWORK' as any,
                severity: ErrorSeverity.CRITICAL,
                message: 'Cannot connect to server. Please check your connection and try again.',
                title: 'Connection Lost',
                timestamp: new Date(),
                retryable: false
              }, {
                autoClose: 3000
              })
              
              // Small delay to show toast, then redirect
              setTimeout(() => {
                window.location.href = '/login'
              }, 1000)
            }
            
            // Reset counter
            this.consecutiveNetworkErrors = 0
            this.lastNetworkErrorTime = null
            
            return Promise.reject(error)
          }
        } else {
          // Reset counter on successful response or non-network error
          this.consecutiveNetworkErrors = 0
          this.lastNetworkErrorTime = null
        }

        // Handle unauthorized - try to refresh token
        if (error.response?.status === HttpStatusCode.Unauthorized) {
          const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

          // Nếu là refresh endpoint hoặc đã retry rồi → redirect login
          if (originalRequest?.url?.includes('/auth/refresh') || originalRequest?._retry) {
            if (window.location.pathname !== '/login') {
              clearLS()
              window.location.href = '/login'
            }
            return Promise.reject(error)
          }

          // Nếu đang refresh → thêm request vào queue
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            })
              .then((token) => {
                if (originalRequest?.headers) {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`
                }
                return this.instance(originalRequest)
              })
              .catch((err) => {
                return Promise.reject(err)
              })
          }

          // Bắt đầu refresh token
          originalRequest._retry = true
          this.isRefreshing = true

          const refreshToken = getRefreshTokenFromLS()

          if (!refreshToken) {
            // Không có refresh token → redirect login
            this.isRefreshing = false
            this.failedQueue = []
            if (window.location.pathname !== '/login') {
              clearLS()
              window.location.href = '/login'
            }
            return Promise.reject(error)
          }

          return authApi
            .refreshToken(refreshToken)
            .then((response) => {
              const { accessToken, refreshToken: newRefreshToken } = response.data || {}

              if (accessToken) {
                setAccessTokenToLS(accessToken)
                if (newRefreshToken) {
                  setRefreshTokenToLS(newRefreshToken)
                }

                // Update header cho request ban đầu
                if (originalRequest?.headers) {
                  originalRequest.headers['Authorization'] = `Bearer ${accessToken}`
                }

                // Process queue
                this.failedQueue.forEach((prom) => {
                  prom.resolve(accessToken)
                })
                this.failedQueue = []
                this.isRefreshing = false

                // Retry original request
                return this.instance(originalRequest)
              } else {
                throw new Error('No access token in refresh response')
              }
            })
            .catch((refreshError) => {
              // Refresh failed → clear và redirect
              this.failedQueue.forEach((prom) => {
                prom.reject(refreshError)
              })
              this.failedQueue = []
              this.isRefreshing = false

              if (window.location.pathname !== '/login') {
                clearLS()
                window.location.href = '/login'
              }
              return Promise.reject(refreshError)
            })
        }

        // Show error toast for non-validation errors
        // Validation errors (422) are handled by forms, don't show toast
        // Don't show toast for 401 if we're handling refresh token
        // Skip global toast for upload endpoints (they have custom error handling)
        const isAuthEndpoint =
          error.config?.url?.includes('/auth/login') ||
          error.config?.url?.includes('/auth/register') ||
          error.config?.url?.includes('/auth/forgot-password')

        const isHandlingRefresh =
          error.response?.status === HttpStatusCode.Unauthorized &&
          !error.config?.url?.includes('/auth/refresh') &&
          !(error.config as InternalAxiosRequestConfig & { _retry?: boolean })?._retry &&
          !isAuthEndpoint
        
        const isUploadEndpoint = error.config?.url?.includes('/documents/upload-batch') ||
                                 error.config?.url?.includes('/documents/preview-ocr') ||
                                 error.config?.url?.includes('/groups/with-vehicle') ||
                                 error.config?.url?.includes('/ocr/')
        
        // Skip toast for optional/non-critical endpoints that may not exist
        const isOptionalEndpoint = error.config?.url?.includes('/usage-report') ||
                                  error.config?.url?.includes('/smart-insights')

        // Only show toast if not handled elsewhere and not a validation/upload/auth/optional error
        if (
          error.response?.status !== HttpStatusCode.UnprocessableEntity &&
          !isHandlingRefresh &&
          !isUploadEndpoint &&
          !isAuthEndpoint &&
          !isOptionalEndpoint
        ) {
          try {
            const errorInfo = convertToErrorInfo(error)
            
            // Create unique toast ID based on URL and status to prevent duplicates from same request
            const url = error.config?.url || 'unknown'
            const status = error.response?.status || 0
            const toastId = `http-error-${url}-${status}`
            
            // Show toast for non-critical errors
            if (errorInfo.severity !== ErrorSeverity.CRITICAL) {
              showErrorToast(errorInfo, {
                toastId, // Same toastId for same URL+status prevents duplicates
                autoClose: errorInfo.severity === ErrorSeverity.HIGH ? 5000 : 3000
              })
            } else {
              // Critical errors should be handled by ErrorModal (can be added later)
              showErrorToast(errorInfo, {
                toastId, // Same toastId for same URL+status prevents duplicates
                autoClose: false
              })
            }
          } catch (e) {
            // Fallback if error conversion fails
            logger.error('Error parsing error message:', e)
            const errorData = error.response?.data as any
            const defaultMessage = errorData?.message || 
                                  errorData?.error || 
                                  error.message || 
                                  'An error occurred. Please try again.'
            
            showErrorToast({
              type: 'UNKNOWN' as any,
              severity: ErrorSeverity.MEDIUM,
              message: defaultMessage,
              timestamp: new Date()
            }, {
              toastId: `http-error-fallback-${Date.now()}`
            })
          }
        }
        return Promise.reject(error)
      }
    )
  }
}

const http = new Http().instance

export default http
