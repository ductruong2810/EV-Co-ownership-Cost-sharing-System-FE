import type { ReactNode } from 'react'

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  rightSlot?: ReactNode
}

/**
 * Header dùng chung cho các trang trong AdminDashboard
 * - Đồng bộ font, kích thước, màu sắc tiêu đề
 * - Hỗ trợ thêm subtitle và phần nội dung bên phải (filter, button, v.v.)
 */
export default function AdminPageHeader({ title, subtitle, eyebrow, rightSlot }: AdminPageHeaderProps) {
  return (
    <header className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        {eyebrow && (
          <p className='text-xs font-semibold uppercase tracking-widest text-gray-400'>
            {eyebrow}
          </p>
        )}
        <h1 className='text-3xl font-bold text-gray-900'>{title}</h1>
        {subtitle && (
          <p className='mt-1 text-sm text-gray-600'>
            {subtitle}
          </p>
        )}
      </div>
      {rightSlot && <div className='flex items-center gap-2'>{rightSlot}</div>}
    </header>
  )
}


