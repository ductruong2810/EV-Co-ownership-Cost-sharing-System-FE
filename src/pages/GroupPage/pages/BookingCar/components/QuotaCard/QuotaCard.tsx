import { Card, Progress } from 'antd'
interface QuotaInfo {
  remainingSlots: number
  totalSlots: number
  usedSlots: number
}

export default function QuotaCard({ quotaUser }: { quotaUser: QuotaInfo }) {
  return (
    <>
      <Card className='shadow-xl border-0 rounded-3xl overflow-hidden hover:shadow-[0_16px_45px_-12px_rgba(14,165,233,0.3)] transition-all duration-400 hover:-translate-y-1.5 bg-gradient-to-br from-white to-sky-50/20'>
        <div className='bg-gradient-to-br from-[#0EA5E9] via-[#3B82F6] to-[#06B6D4] -m-6 p-5 sm:p-6 h-full relative overflow-hidden'>
          <div className='absolute inset-0 bg-white/5'></div>
          <div className='absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-3xl'></div>
          <div className='relative z-10 flex flex-col justify-between h-full min-h-[210px]'>
            <div className='text-white text-2xl font-black uppercase tracking-widest text-center mb-2.5'>Quota</div>
            <div className='flex-1 flex items-center justify-center'>
              <div className='relative'>
                <Progress
                  type='circle'
                  percent={(quotaUser.usedSlots / quotaUser.totalSlots) * 100}
                  format={() => (
                    <div className='text-white font-black text-2xl'>
                      {quotaUser.usedSlots}/{quotaUser.totalSlots}
                    </div>
                  )}
                  size={100}
                  strokeColor='#ffffff'
                  trailColor='rgba(255,255,255,0.15)'
                  strokeWidth={12}
                />
                <div className='absolute inset-0 rounded-full blur-xl bg-white/20'></div>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='bg-white/22 backdrop-blur-md rounded-2xl p-3.5 text-center shadow-lg ring-1 ring-white/25'>
                <div className='text-white font-black text-xl'>{quotaUser.usedSlots}</div>
                <div className='text-white/90 text-2xs font-bold uppercase tracking-wide'>booked</div>
              </div>
              <div className='bg-white/22 backdrop-blur-md rounded-2xl p-3.5 text-center shadow-lg ring-1 ring-white/25'>
                <div className='text-white font-black text-lg leading-tight'>{quotaUser.remainingSlots} slot/week</div>
                <div className='text-white/90 text-2xs font-bold uppercase tracking-wide'>remaining car booking</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}
