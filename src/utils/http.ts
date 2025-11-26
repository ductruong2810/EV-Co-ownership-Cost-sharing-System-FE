import axios, { AxiosError, HttpStatusCode, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import config from '../constants/config'
import { clearLS, getAccessTokenFromLS, getRefreshTokenFromLS, setAccessTokenToLS, setRefreshTokenToLS } from './auth'
import { toast } from 'react-toastify'
import { getUserFriendlyError, logError } from './errorHandler'
import logger from './logger'
import authApi from '../apis/auth.api'

class Http {
  instance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  }> = []

  constructor() {
    this.instance = axios.create({
      baseURL: config.baseUrl,
      timeout: 20000, // 20 giây
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
        const isHandlingRefresh = error.response?.status === HttpStatusCode.Unauthorized && 
                                  !error.config?.url?.includes('/auth/refresh') &&
                                  !(error.config as InternalAxiosRequestConfig & { _retry?: boolean })?._retry
        
        const isUploadEndpoint = error.config?.url?.includes('/documents/upload-batch') ||
                                 error.config?.url?.includes('/documents/preview-ocr') ||
                                 error.config?.url?.includes('/groups/with-vehicle') ||
                                 error.config?.url?.includes('/ocr/')

        if (error.response?.status !== HttpStatusCode.UnprocessableEntity && !isHandlingRefresh && !isUploadEndpoint) {
          try {
            const message = getUserFriendlyError(error)
            toast.error(message, {
              autoClose: 3000,
              position: 'top-right'
            })
          } catch (e) {
            // Nếu có lỗi khi parse error message, hiển thị message mặc định
            logger.error('Error parsing error message:', e)
            const errorData = error.response?.data as any
            const defaultMessage = errorData?.message || 
                                  errorData?.error || 
                                  error.message || 
                                  'An error occurred. Please try again.'
            toast.error(defaultMessage, {
              autoClose: 3000,
              position: 'top-right'
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
