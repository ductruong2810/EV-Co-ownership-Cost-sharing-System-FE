import { CheckCircleOutlined } from '@ant-design/icons'

export default function StepCard({
  num,
  title,
  desc,
  color,
  status = 'pending',
  onClick,
  isClickable = false
}: {
  num: string
  title: string
  desc: string
  color: string
  status?: 'completed' | 'pending'
  onClick?: () => void
  isClickable?: boolean
}) {
  const isCompleted = status === 'completed'
  const canClick = isClickable && onClick

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`group/item flex items-start gap-5 rounded-2xl backdrop-blur-lg border-[2px] p-6 transition-all duration-400 ${
        isCompleted
          ? 'bg-white/20 border-green-300/60 shadow-[0_0_25px_rgba(16,185,129,0.4),inset_0_1px_10px_rgba(255,255,255,0.12)]'
          : 'bg-white/10 border-white/30 hover:border-green-300/50 shadow-[0_0_20px_rgba(16,185,129,0.2),inset_0_1px_10px_rgba(255,255,255,0.08)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
      } ${canClick ? 'cursor-pointer hover:bg-white/15' : 'cursor-default'}`}
    >
      <div
        className={`flex-shrink-0 size-14 rounded-xl bg-gradient-to-br ${color} border-[2px] border-white/50 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover/item:scale-110 group-hover/item:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-400 relative`}
      >
        {isCompleted ? (
          <CheckCircleOutlined className='text-white text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' />
        ) : (
          <span className='text-white font-black text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'>{num}</span>
        )}
      </div>
      <div className='flex-1 pt-1'>
        <div className='flex items-center gap-2 mb-1.5'>
          <h3 className='text-white font-bold text-lg leading-snug drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'>
            {title}
          </h3>
          {isCompleted && (
            <span className='px-2 py-0.5 rounded-full bg-green-500/30 text-green-200 text-xs font-semibold border border-green-400/40'>
              ✓ Completed
            </span>
          )}
          {!isCompleted && isClickable && (
            <span className='px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-200 text-xs font-semibold border border-yellow-400/40'>
              Click to start
            </span>
          )}
        </div>
        <p className='text-white/75 text-sm leading-relaxed font-medium'>{desc}</p>
      </div>
    </div>
  )
}
