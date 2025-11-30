const config = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/',
  // Khai báo max size upload ảnh tính theo bytes
  maxSizeUploadAvatar: 1048576
}

// Log API base URL in development mode for debugging
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', config.baseUrl)
}

export default config
