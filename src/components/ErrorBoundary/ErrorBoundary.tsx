import React, { Component, ErrorInfo, ReactNode } from 'react'
import logger from '../../utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component to catch React errors
 * Prevents entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console/error tracking service
    logger.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 p-4'>
          <div className='max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center'>
            <div className='mb-6'>
              <div className='mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4'>
                <svg
                  className='w-8 h-8 text-red-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
              </div>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>Something went wrong</h2>
              <p className='text-gray-600 mb-6'>
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className='mb-6 p-4 bg-gray-100 rounded-lg text-left'>
                <p className='text-sm font-mono text-red-600 break-words'>
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className='mt-2'>
                    <summary className='text-sm text-gray-600 cursor-pointer'>Stack trace</summary>
                    <pre className='text-xs mt-2 overflow-auto max-h-40 text-gray-700'>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className='flex gap-4 justify-center'>
              <button
                onClick={this.handleReset}
                className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className='px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary












