import { Link } from 'react-router-dom'
import path from '../../constants/path'
import { useMutation } from '@tanstack/react-query'
import authApi from '../../apis/auth.api'
import { clearLS, getAccessTokenFromLS, getRoleFromLS } from '../../utils/auth'
import { useContext } from 'react'
import { AppContext } from '../../contexts/app.context'
import { showSuccessToast } from '../Error'
import { LOGO_URL } from '../../constants/images'
import { useLanguage } from '../../contexts/language.context'
import { GlobalOutlined } from '@ant-design/icons'

function HeaderStaff() {
  // lấy state global từ contextApi
  const { setIsAuthenticated } = useContext(AppContext)

  const role = getRoleFromLS()
  const { language, toggleLanguage } = useLanguage()
  const isEn = language === 'en'

  //call api logout
  // ***Mình không cần navigate vì khi set về false thì nó sẽ tự chuyển cho mình về login
  // Component
  const logoutMutation = useMutation({
    mutationFn: authApi.logout
  })

  const handleLogout = () => {
    const accessToken = getAccessTokenFromLS()

    logoutMutation.mutate(accessToken, {
      //Truyền token gốc (không có "Bearer")
      onSuccess: () => {
        // Hiển thị toast TRƯỚC khi redirect
        showSuccessToast('You have been logged out successfully. See you again!', 'Logout Successful')
        
        // Delay redirect để user thấy toast
        setTimeout(() => {
          //Set lại biến này để move ra trang ngoài
          setIsAuthenticated(false)
          //Xóa trên localstorage
          clearLS()
        }, 500) // 500ms delay để toast hiển thị
      }
    })
  }

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    STAFF: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    TECHNICIAN: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
  }

  const roleColor = roleColors[role] || roleColors.STAFF

  return (
    <header className='sticky top-0 z-50 w-full backdrop-blur-md bg-white/95 shadow-md border-b border-gray-200/50'>
      <div className='flex flex-row justify-between items-center px-4 sm:px-6 py-2 max-w-7xl mx-auto'>
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
              Management Console
            </span>
          </div>
        </Link>

        <div className='flex items-center gap-2 sm:gap-4'>
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className='flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-teal-400 transition-all duration-200 group'
            title={isEn ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
          >
            <GlobalOutlined className={`text-base ${isEn ? 'text-blue-600' : 'text-teal-600'} group-hover:scale-110 transition-transform`} />
          </button>

          <div className='hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm'>
            <span className='text-xs text-gray-600 font-medium'>Welcome,</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${roleColor.bg} ${roleColor.text} ${roleColor.border} shadow-sm`}>
              {role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className='font-semibold text-center px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm text-white rounded-lg transition-all 
           duration-300 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
           hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
           flex items-center gap-2 shadow-md'
          >
            {logoutMutation.isPending ? (
              <>
                <span className='animate-spin rounded-full h-3 w-3 border-b-2 border-white'></span>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Gradient Strip at Bottom */}
      <div className='h-0.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500' />
    </header>
  )
}

export default HeaderStaff
