import type { ReactNode } from 'react'

interface AdminPageContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Chuẩn hoá layout chung cho các trang trong AdminDashboard:
 * - Căn giữa theo chiều ngang với max-width cố định
 * - Dùng khoảng cách dọc mặc định
 * - Không set background hoặc min-h-screen (đã được layout bên ngoài lo)
 */
export default function AdminPageContainer({ children, className = '' }: AdminPageContainerProps) {
  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {children}
    </div>
  )
}


