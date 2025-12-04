import { Link, NavLink } from 'react-router-dom'
import path from '../../constants/path'
import classNames from 'classnames'
import { useI18n } from '../../i18n/useI18n'

export default function LearnmoreHeader() {
  const { t } = useI18n()

  return (
    <header className='bg-black top-0 z-50 overflow-x-auto '>
      <div className='flex justify-between items-center px-6'>
        <Link to={path.home} className='flex w-28 h-28 items-center mr-24 hover:scale-90 transition-transform'>
          <img src='src/assets/black.png' alt='logo' className='block w-full h-full object-contain' />
          <div className='ml-2 text-lg font-semibold text-slate-100 text-[14px]'>EVShare</div>
        </Link>

        <div className='flex  justify-between items-center'>
          <NavLink
            to={path.learnMore}
            className={({ isActive }) =>
              classNames(
                ' font-semibold text-center w-32 text-[14px]  py-3 rounded-lg  transition duration-300 hover:bg-red-600 mr-2',
                {
                  'bg-red-600 text-[#fff]': isActive,
                  'text-[#fff]': !isActive
                }
              )
            }
          >
            {t('lm_header_faq')}
          </NavLink>
          <NavLink
            to={path.home.concat('#about')}
            className={({ isActive }) =>
              classNames(
                ' font-semibold text-center w-32 text-[14px] py-3 rounded-lg transition duration-300  hover:bg-red-600',
                {
                  'bg-red-600': isActive,
                  'text-[#fff]': !isActive
                }
              )
            }
          >
            {t('lm_header_about')}
          </NavLink>
        </div>
      </div>
    </header>
  )
}
