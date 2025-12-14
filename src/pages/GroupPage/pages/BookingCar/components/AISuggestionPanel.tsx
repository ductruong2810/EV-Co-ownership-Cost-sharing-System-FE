import { BulbOutlined } from '@ant-design/icons'
import type { BookingSuggestion } from '../../../../../types/api/group.type'

interface AISuggestionPanelProps {
  suggestions?: BookingSuggestion[]
  insights?: string[]
  isLoading: boolean
}

const badgeMap: Record<string, string> = {
  HIGH: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white',
  MEDIUM: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white',
  LOW: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800'
}

const AISuggestionPanel = ({ suggestions, insights, isLoading }: AISuggestionPanelProps) => {
  if (isLoading) {
    return (
      <div className='bg-white rounded-3xl p-6 shadow-xl border border-cyan-100'>
        <div className='flex items-center gap-3 text-cyan-600 font-semibold'>
          <BulbOutlined />
          Generating smart suggestions...
        </div>
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className='bg-white rounded-3xl p-6 shadow-xl border border-cyan-100 space-y-6'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2'>
            <BulbOutlined /> AI Recommendation
          </p>
          <h3 className='text-2xl font-bold text-slate-900 mt-1'>Recommended Slots This Week</h3>
        </div>
      </div>

      <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {suggestions.map((item) => (
          <div
            key={`${item.date}-${item.timeRange}`}
            className='rounded-2xl border border-slate-100 p-4 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg transition-all duration-200'
          >
            <div className='flex items-center justify-between mb-3'>
              <div>
                <p className='text-sm font-semibold text-slate-500'>{item.dayOfWeek}</p>
                <p className='text-lg font-bold text-slate-900'>{item.date}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeMap[item.recommendationLevel || 'MEDIUM'] || badgeMap.MEDIUM}`}>
                {item.recommendationLevel || 'MEDIUM'}
              </span>
            </div>
            <p className='text-xl font-bold text-cyan-600'>{item.timeRange}</p>
            <p className='text-xs text-slate-500 uppercase tracking-wide mt-1'>
              {item.suitability ? item.suitability.replace('_', ' ') : 'BALANCED'} · Score {item.score?.toFixed(0) || '0'}
            </p>
            <p className='text-sm text-slate-600 mt-3 leading-relaxed'>{item.reason}</p>
          </div>
        ))}
      </div>

      {insights && insights.length > 0 && (
        <div className='bg-cyan-50 border border-cyan-100 rounded-2xl p-4'>
          <p className='text-xs font-bold text-cyan-700 uppercase mb-2'>AI Insights</p>
          <ul className='space-y-2 text-sm text-cyan-900'>
            {insights.map((insight, idx) => (
              <li key={idx} className='flex items-start gap-2'>
                <span className='mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500'></span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AISuggestionPanel

