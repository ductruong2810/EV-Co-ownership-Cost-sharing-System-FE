import { Link, useMatch } from 'react-router-dom'
import path from '../../constants/path'
import CoOwnerSideBar from '../CoOwnerSideBar'
import NavHeader from '../NavHeader'
import { LOGO_URL } from '../../constants/images'

export default function Header() {
  // booleam  để mô tả nếu là dường dẫn khi bấm vào nhóm thì hiên thị sidebar các chức năng của đồng sở hữu
  const isMatch = useMatch('/dashboard/viewGroups/:groupId/*')

  return (
    <header className='sticky top-0 z-50 w-full backdrop-blur-md bg-white/95 shadow-md border-b border-gray-200/50'>
      <div className='flex flex-row justify-between items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-3 max-w-7xl mx-auto gap-2 sm:gap-4'>
        {/* Logo */}
        <Link 
          to={path.home} 
          className='flex items-center gap-3 transition-all duration-300 hover:scale-105 group'
        >
          <div className='relative'>
            <img 
              src={LOGO_URL.white} 
              alt='logo' 
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

        {/* Chỉ hiển thị khi đang ở trang group detail */}
        <div className='flex-1 flex justify-center mx-2 sm:mx-4 min-w-0'>
          {isMatch && <CoOwnerSideBar />}
        </div>

        {/* NavHeader */}
        <div className='flex items-center'>
          <NavHeader />
        </div>
      </div>
      
      {/* Gradient Strip at Bottom */}
      <div className='h-0.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500' />
    </header>
  )
}
