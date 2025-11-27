import { Outlet } from 'react-router-dom'
import RegisterHeader from '../../components/RegisterHeader/RegisterHeader'
import Footer from '../../components/Footer/Footer'

function RegisterLayout() {
  return (
    <div>
      <RegisterHeader />
      <Outlet />
      <Footer />
    </div>
  )
}

export default RegisterLayout
