import axios from 'axios'

// Use the VITE_API_URL env var in production (Vercel → Render).
// In development, Vite's proxy forwards /api to localhost:8080.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the JWT from localStorage on every authenticated request.
// This interceptor runs before each request so token refreshes (if added later)
// are automatically picked up without changing individual call sites.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulsevote_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// === Types ===
export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Poll {
  id: string
  creator_id: string
  question: string
  options: string[]
  status: 'active' | 'closed' | 'expired'
  expires_at?: string
  created_at: string
}

export interface OptionResult {
  index: number
  option: string
  votes: number
  percentage: number
}

export interface ResultsResponse {
  poll_id: string
  question: string
  status: 'active' | 'closed' | 'expired'
  results: OptionResult[]
  total_votes: number
}

export interface DashboardStats {
  total: number
  active: number
  closed: number
  expired: number
}

export interface CreatePollPayload {
  question: string
  options: string[]
  expires_at?: string
}

// === Auth API ===
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),
}

// === Poll API ===
export const pollApi = {
  create: (payload: CreatePollPayload) =>
    api.post<Poll>('/api/polls', payload),

  getById: (id: string) =>
    api.get<Poll>(`/api/polls/${id}`),

  list: () =>
    api.get<Poll[]>('/api/polls'),

  close: (id: string) =>
    api.patch(`/api/polls/${id}/close`),

  delete: (id: string) =>
    api.delete(`/api/polls/${id}`),

  getDashboard: () =>
    api.get<DashboardStats>('/api/dashboard'),
}

// === Vote API ===
export const voteApi = {
  vote: (pollId: string, optionIndex: number) =>
    api.post<ResultsResponse>(`/api/polls/${pollId}/vote`, { option_index: optionIndex }),

  getResults: (pollId: string) =>
    api.get<ResultsResponse>(`/api/polls/${pollId}/results`),
}

export default api
