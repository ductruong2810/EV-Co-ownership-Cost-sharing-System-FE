import { Fragment, useMemo, useState } from 'react'
import FAQTitle from './components/FAQTitle'
import FAQAside from './components/FAQAside'
import FAQMainContext from './components/FAQMainContext'
import FAQWrapper from './components/FAQWrapper'
import { createFaqContent } from './data/FAQData'

export default function Learnmore() {
  const { categories, faqs } = useMemo(() => createFaqContent(), [])

  const [selectedCategory, setSelectedCategory] = useState<number>(categories[0].id)
  const [activeFaq, setActiveFaq] = useState<string>(categories[0].key)

  const propChild = {
    categories,
    selectedCategory,
    setSelectedCategory,
    setActiveFaq
  }

  return (
    <Fragment>
      <FAQWrapper classInput='bg-slate-100 text-center py-12'>
        <FAQTitle />
      </FAQWrapper>
      <FAQWrapper>
        <FAQAside propChild={propChild} />
        <FAQMainContext faqs={faqs} activeFaq={activeFaq} />
      </FAQWrapper>
    </Fragment>
  )
}
