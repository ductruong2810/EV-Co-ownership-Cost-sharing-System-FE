/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useEffect } from 'react'
import { createAvatar } from '@dicebear/core'
import { lorelei } from '@dicebear/collection'

interface AvatarProps {
  avatar?: string
  userId?: string
  size?: number // px
  className?: string
  onClick?: () => void
}

export default function Avatar({ avatar, userId, size = 128, className = '', onClick }: AvatarProps) {
  // Generate default avatar từ DiceBear, deterministic theo userId
  // Avatar này sẽ luôn được tạo nếu có userId, dùng làm fallback khi chưa có avatarUrl
  const generatedAvatar = useMemo(() => {
    if (!userId) {
      // Fallback: generate với seed mặc định nếu không có userId
      return createAvatar(lorelei as any, {
        size,
        seed: 'default-avatar',
        backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf']
      }).toDataUri()
    }

    const seed = userId

    return createAvatar(lorelei as any, {
      size,
      seed,
      backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf']
    }).toDataUri()
  }, [userId, size])

  // Ưu tiên avatar custom (nếu có và hợp lệ), fallback sang generated avatar
  // Chỉ dùng avatarUrl nếu nó không null/empty và là URL hợp lệ
  const hasCustomAvatar = avatar && avatar.trim() !== '' && avatar !== 'null'
  
  // Track previous avatar URL to add cache busting only when URL changes
  const prevAvatarRef = useRef<string | undefined>(avatar)
  const cacheBustRef = useRef<number>(Date.now())
  
  useEffect(() => {
    // If avatar URL changed, update cache bust timestamp
    if (hasCustomAvatar && avatar !== prevAvatarRef.current) {
      cacheBustRef.current = Date.now()
      prevAvatarRef.current = avatar
    }
  }, [avatar, hasCustomAvatar])
  
  // Add cache busting to force browser to reload image when URL changes
  const avatarWithCacheBust = hasCustomAvatar 
    ? `${avatar}${avatar.includes('?') ? '&' : '?'}t=${cacheBustRef.current}`
    : null
  const src = avatarWithCacheBust || generatedAvatar

  return (
    <button
      type='button'
      onClick={onClick}
      className={`relative group focus:outline-none ${className}`}
      aria-label='Change avatar'
    >
      <div
        className='rounded-full overflow-hidden 
                   border-[4px] border-white/60 
                   transition-all duration-300 
                   group-hover:scale-105 
                   group-hover:shadow-[0_0_40px_rgba(6,182,212,0.8)]'
        style={{ width: size, height: size }}
      >
        <img 
          src={src} 
          alt='Avatar' 
          className='w-full h-full object-cover' 
          loading='lazy'
          onError={(e) => {
            // Nếu avatarUrl load lỗi, fallback về generated avatar
            if (hasCustomAvatar) {
              const target = e.target as HTMLImageElement
              // Log error để debug (chỉ trong development)
              if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to load avatar from R2:', src, 'Falling back to generated avatar')
              }
              target.src = generatedAvatar
            }
          }}
          onLoad={() => {
            // Log success để debug (chỉ trong development)
            if (process.env.NODE_ENV === 'development' && hasCustomAvatar) {
              console.log('Successfully loaded avatar from R2:', src)
            }
          }}
        />
      </div>

      {/* Hover overlay hint */}
      {onClick && (
        <div className='absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300'>
          <span className='text-xs font-semibold text-white/90 bg-black/50 px-3 py-1 rounded-full'>
            Change avatar
          </span>
        </div>
      )}
    </button>
  )
}
