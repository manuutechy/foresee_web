import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const client = axios.create({
  baseURL: API_BASE,
})

// Uploaded images come back as relative paths (e.g. "/uploads/xyz.png"); prefix
// them with the API origin so <img> tags resolve. Absolute URLs pass through.
export function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return API_BASE + path
}

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('foresight_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('foresight_token')
    }
    return Promise.reject(err)
  }
)

export default client
