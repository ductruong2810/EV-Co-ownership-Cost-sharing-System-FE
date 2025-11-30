import classNames from 'classnames'
import { Link, NavLink, useLocation } from 'react-router-dom'
import path from '../../constants/path'
import { LOGO_URL } from '../../constants/images'

function RegisterHeader() {
  // Lấy route hiện tại trên đường dẫn để active trang home
  const route = useLocation()

  return (
    <header className='sticky top-0 z-50 w-full backdrop-blur-md bg-white/95 shadow-md border-b border-gray-200/50'>
      <div className='flex justify-between items-center px-4 sm:px-6 py-2 max-w-7xl mx-auto'>
        {/* Logo Section */}
        <Link 
          to={path.home} 
          className='flex items-center gap-3 transition-all duration-300 hover:scale-105 group'
        >
          <div className='relative'>
            <img 
              src={LOGO_URL.white} 
              alt='EVShare Logo' 
              className='block w-10 h-10 sm:w-12 sm:h-12 object-contain transition-transform group-hover:rotate-6' 
            />
            <div className='absolute inset-0 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          </div>
          <div className='flex flex-col'>
            <span className='text-base sm:text-lg font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent group-hover:from-teal-500 group-hover:via-cyan-500 group-hover:to-teal-500 transition-all duration-300'>
              EVShare
            </span>
            <span className='text-[9px] sm:text-[10px] text-gray-500 font-medium hidden sm:block'>
              Co-ownership Platform
            </span>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className='flex items-center gap-3'>
          <NavLink
            to={path.login}
            className={({ isActive }) =>
              classNames(
                'relative font-semibold text-center px-5 sm:px-6 py-1.5 sm:py-2 text-sm rounded-lg transition-all duration-300 overflow-hidden group',
                {
                  'text-white bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 active:scale-95': isActive,
                  'text-gray-700 bg-white border-2 border-gray-300 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 hover:scale-105 active:scale-95 shadow-sm': !isActive
                }
              )
            }
          >
            <span className='relative z-10'>Login</span>
            <div className='absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          </NavLink>
          
          <NavLink
            to={path.register}
            className={({ isActive }) =>
              classNames(
                'relative font-semibold text-center px-5 sm:px-6 py-1.5 sm:py-2 text-sm rounded-lg transition-all duration-300 overflow-hidden group',
                {
                  'text-white bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 active:scale-95': isActive || route.pathname === path.home,
                  'text-gray-700 bg-white border-2 border-gray-300 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 hover:scale-105 active:scale-95 shadow-sm': !isActive && route.pathname !== path.home
                }
              )
            }
          >
            <span className='relative z-10'>Register</span>
            <div className='absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          </NavLink>
        </div>
      </div>
      
      {/* Gradient Strip at Bottom */}
      <div className='h-0.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500' />
    </header>
  )
}

export default RegisterHeader
