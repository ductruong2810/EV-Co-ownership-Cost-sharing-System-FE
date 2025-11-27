import { Outlet } from 'react-router-dom'
import HeaderStaff from '../../components/HeaderStaff'

function ManagerLayout() {
  return (
    <div>
      <HeaderStaff />
      <Outlet />
    </div>
  )
}

export default ManagerLayout
