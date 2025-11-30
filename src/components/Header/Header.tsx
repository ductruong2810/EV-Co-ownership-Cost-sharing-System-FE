import { Link, useMatch } from 'react-router-dom'
import path from '../../constants/path'
import CoOwnerSideBar from '../CoOwnerSideBar'
import NavHeader from '../NavHeader'
import { LOGO_URL } from '../../constants/images'

export default function Header() {
  // booleam  để mô tả nếu là dường dẫn khi bấm vào nhóm thì hiên thị sidebar các chức năng của đồng sở hữu
  const isMatch = useMatch('/dashboard/viewGroups/:groupId/*')

  return (
    <header className='sticky top-0 z-50 w-full backdrop-blur-md bg-white/95 shadow-lg border-b border-gray-200/50'>
      <div className='flex flex-row justify-between items-center px-4 sm:px-6 py-3 max-w-7xl mx-auto'>
        {/* Logo */}
        <Link 
          to={path.home} 
          className='flex items-center gap-3 transition-all duration-300 hover:scale-105 group'
        >
          <div className='relative'>
            <img 
              src={LOGO_URL.white} 
              alt='logo' 
              className='block w-12 h-12 sm:w-16 sm:h-16 object-contain transition-transform group-hover:rotate-6' 
            />
            <div className='absolute inset-0 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          </div>
          <div className='flex flex-col'>
            <span className='text-lg sm:text-xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent group-hover:from-teal-500 group-hover:via-cyan-500 group-hover:to-teal-500 transition-all duration-300'>
              EVShare
            </span>
            <span className='text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:block'>
              Co-ownership Platform
            </span>
          </div>
        </Link>

        {/* Chỉ hiển thị khi đang ở trang group detail */}
        <div className='flex-1 flex justify-center mx-4'>
          {isMatch && <CoOwnerSideBar />}
        </div>

        {/* NavHeader */}
        <div className='flex items-center'>
          <NavHeader />
        </div>
      </div>
    </header>
  )
}
