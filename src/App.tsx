import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import './styles/toast.css'
import Routers from './routers/configRouters'
import ErrorBoundary from './components/ErrorBoundary'
import { ErrorProvider } from './contexts/ErrorContext'
import { BackendHealthMonitor } from './components/BackendHealthMonitor'
import { BackendHealthBanner } from './components/BackendHealthBanner'

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <div>
          <BackendHealthMonitor>
            <BackendHealthBanner />
            <Routers />
          </BackendHealthMonitor>
          <ToastContainer
            position='top-right'
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme='light'
            limit={5}
            style={{
              zIndex: 10000,
              top: '80px' // Position below header
            }}
            toastClassName='custom-toast'
            bodyClassName='custom-toast-body'
            progressClassName='custom-toast-progress'
          />
        </div>
      </ErrorProvider>
    </ErrorBoundary>
  )
}

export default App
