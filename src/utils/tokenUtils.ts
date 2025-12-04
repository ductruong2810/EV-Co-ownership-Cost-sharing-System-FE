import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  exp: number
  userId?: number
  email?: string
  role?: string
}

export const getToken = () => localStorage.getItem('access_token')

export const isTokenExpired = (): boolean => {
  const token = getToken()
  if (!token) return true

  try {
    const decoded = jwtDecode<JwtPayload>(token)
    const currentTime = Date.now() / 1000
    return decoded.exp < currentTime
  } catch {
    return true
  }
}

export const getUserIdFromToken = (): string | null => {
  const token = getToken()
  if (!token) return null

  try {
    const decoded = jwtDecode<JwtPayload>(token)
    return decoded.userId?.toString() || null
  } catch {
    return null
  }
}
