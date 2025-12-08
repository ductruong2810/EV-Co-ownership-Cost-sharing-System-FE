import { CalendarOutlined, CarOutlined } from '@ant-design/icons'
import Card from 'antd/es/card/Card'

interface VehicleInforCardProps {
  brand: string
  model: string
  licensePlate: string
  weekStart: string
  weekEnd: string
}

export default function VehicleInforCard({ brand, licensePlate, weekStart, weekEnd, model }: VehicleInforCardProps) {
  return (
    <>
      <Card
        className='shadow-xl border-0 rounded-3xl overflow-hidden hover:shadow-[0_16px_45px_-12px_rgba(6,182,212,0.35)] transition-all duration-400 hover:-translate-y-1.5 bg-gradient-to-br from-white to-cyan-50/20 h-full'
        bodyStyle={{ padding: 0, height: '100%' }}
      >
        <div className='bg-gradient-to-br from-[#06B6D4] via-[#0EA5E9] to-[#22D3EE] p-5 sm:p-6 h-full relative overflow-hidden'>
          <div className='absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-3xl'></div>
          <div className='absolute bottom-0 left-0 w-20 h-20 bg-white/6 rounded-full blur-2xl'></div>
          <div className='relative z-10 flex flex-col h-full justify-between min-h-[210px]'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='bg-white/28 backdrop-blur-xl p-3 rounded-2xl shadow-xl ring-2 ring-white/20'>
                <CarOutlined style={{ fontSize: '28px', color: 'white' }} />
              </div>
              <h2 className='text-base font-black text-white uppercase tracking-wide'>
                Calendar booking car
              </h2>
            </div>
            <div className='flex-1 flex flex-col justify-center space-y-2.5'>
              <div className='text-white text-2xl font-black tracking-tight leading-snug'>
                {brand} {model}
              </div>
              <div className='text-white/95 text-lg font-bold'>{licensePlate}</div>
              <div className='bg-white/22 backdrop-blur-md rounded-2xl py-2 px-4 inline-block shadow-lg ring-1 ring-white/25'>
                <span className='text-white text-base font-bold text-center'>
                  {weekStart} - {weekEnd}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}
