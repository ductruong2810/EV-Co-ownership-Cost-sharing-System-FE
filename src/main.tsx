// Polyfill for global (needed for sockjs-client)
if (typeof global === 'undefined') {
  (window as any).global = window
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppProvider } from './contexts/app.context'
import { LanguageProvider } from './contexts/language.context'

// Create a client
// Note: Errors are handled by axios interceptor in http.ts
// React Query will not show duplicate toasts because errors are caught at the HTTP level
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0
      // Errors are handled by http.ts interceptor, no need for global onError
    },
    mutations: {
      retry: 0
      // Errors are handled by http.ts interceptor, no need for global onError
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppProvider>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </AppProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>
)
