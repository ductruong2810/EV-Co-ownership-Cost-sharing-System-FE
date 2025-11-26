import { ToastContainer } from 'react-toastify'
import './App.css'
import Routers from './routers/configRouters'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <div>
        <Routers />
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}

export default App
