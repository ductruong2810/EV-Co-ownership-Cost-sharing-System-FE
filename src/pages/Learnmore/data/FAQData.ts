import type { Category, FagSection } from '../../../types/page/learnmore.types'
import { useI18n } from '../../../i18n/useI18n'

export const createFaqContent = () => {
  const { t } = useI18n()

  const categories: Category[] = [
    { id: 1, name: t('faq_cat_understanding'), key: 'Understanding-EV-Share' },
    { id: 2, name: t('faq_cat_pricing'), key: 'Pricing' },
    { id: 3, name: t('faq_cat_delivery'), key: 'Car-Delivery' },
    { id: 4, name: t('faq_cat_usage_policy'), key: 'Car-Usage-Policy' }
  ]

  const faqs: FagSection = {
    'Understanding-EV-Share': [
      {
        question: t('faq_q_what_is'),
        answer: t('faq_a_what_is')
      },
      {
        question: t('faq_q_how_it_works'),
        answer: t('faq_a_how_it_works')
      },
      {
        question: t('faq_q_add_remove'),
        answer: t('faq_a_add_remove')
      }
    ],
    Pricing: [
      {
        question: t('faq_q_cost_general'),
        answer: t('faq_a_cost_general')
      },
      {
        question: t('faq_q_cost_detail'),
        answer: t('faq_a_cost_detail')
      },
      {
        question: t('faq_q_hidden_fees'),
        answer: t('faq_a_hidden_fees')
      }
    ],
    'Car-Delivery': [
      {
        question: t('faq_q_when_get_car'),
        answer: t('faq_a_when_get_car')
      },
      {
        question: t('faq_q_delivery_how'),
        answer: t('faq_a_delivery_how')
      },
      {
        question: t('faq_q_inspection'),
        answer: t('faq_a_inspection')
      }
    ],
    'Car-Usage-Policy': [
      {
        question: t('faq_q_schedule'),
        answer: t('faq_a_schedule')
      },
      {
        question: t('faq_q_limits'),
        answer: t('faq_a_limits')
      },
      {
        question: t('faq_q_tracking'),
        answer: t('faq_a_tracking')
      }
    ]
  }

  return { categories, faqs }
}

