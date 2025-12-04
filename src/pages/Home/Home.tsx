import { Fragment } from 'react/jsx-runtime'
import HomeAnimation from './components/HomeAnimation'
import HomeSlide from './components/HomeSlide'
import HomeService from './components/HomeService'
import HomeLine from './components/HomeLine'
import HomeAbout from './components/HomeAbout'
import HomeImage from './components/HomeImage'
import { BACKGROUNDFIXED_IMG_URL } from '../../constants/images'
import { useI18n } from '../../i18n/useI18n'

function Home() {
  const { t } = useI18n()

  return (
    <Fragment>
      <HomeAnimation />
      <HomeImage
        image={BACKGROUNDFIXED_IMG_URL.first} //
        content={t('home_hero_first')}
      />
      <HomeService />
      <HomeImage
        image={BACKGROUNDFIXED_IMG_URL.second} //
        content={t('home_hero_second')}
      />
      <HomeAbout />
      <HomeLine />
      <HomeSlide />
    </Fragment>
  )
}

export default Home
