const config = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/',
  // Khai báo max size upload ảnh tính theo bytes
  maxSizeUploadAvatar: 1048576
}

export default config
