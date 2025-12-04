import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../../../i18n/useI18n'

export default function HomeAbout() {
  const { t } = useI18n()
  //Trên đường dẫn lấy sau dấu #
  const { hash } = useLocation()

  //Cứ hash thay đổi thì làm
  useEffect(() => {
    const about = document.getElementById(hash.replace('#', ''))
    //Nếu có thì duy chuyển xuống dưới mượt đi
    if (about) {
      about.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <section
      id='about'
      className='border-t-0 py-24 bg-gradient-to-b from-emerald-50 via-white to-cyan-50 border-b-4 border-teal-200'
    >
      <div className='relative max-w-4xl mx-auto px-8 py-20 bg-white shadow-xl rounded-lg text-center'>
        <motion.h2
          className='text-3xl md:text-4xl font-extrabold text-emerald-600 mb-12'
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.6 }}
        >
          {t('lm_header_about')}
        </motion.h2>
        <motion.p
          className='text-gray-600 text-base md:text-lg font-light  max-w-3xl mx-auto text-center mb-4 text-start leading-relaxed'
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          viewport={{ once: true, amount: 0.6 }}
        >
          {t('home_about_content')}
        </motion.p>
      </div>
    </section>
  )
}
