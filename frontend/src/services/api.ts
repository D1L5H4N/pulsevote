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

export type PollStatus = 'active' | 'closed' | 'expired' | 'scheduled'

export interface Poll {
  id: string
  creator_id: string
  question: string
  options: string[]
  status: PollStatus
  views?: number
  starts_at?: string
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
  type?: string
  poll_id: string
  question: string
  status: PollStatus
  results: OptionResult[]
  total_votes: number
  expires_at?: string
  total_viewers?: number
  active_participants?: number
  observing?: number
}

export interface TimelinePoint {
  timestamp: string
  votes: number
  cumulative: number
}

export interface DashboardStats {
  total: number
  active: number
  closed: number
  expired: number
  scheduled?: number
  total_polls: number
  active_polls: number
  closed_polls: number
  total_votes: number
  total_participants: number
  total_views: number
  avg_engagement: number
}

export interface PollAnalyticsItem {
  id: string
  question: string
  options: string[]
  status: PollStatus
  created_at: string
  expires_at?: string
  votes: number
  views: number
  participants: number
  participation_rate: number
  engagement_score: number
}

export interface DeviceBreakdown {
  mobile: number
  desktop: number
  tablet: number
  mobile_pct: number
  desktop_pct: number
  tablet_pct: number
}

export interface GeoItem {
  country: string
  votes: number
  percentage: number
}

export interface ActivityFeedItem {
  id: string
  user_id: string
  poll_id: string
  poll_title: string
  type: 'vote' | 'create' | 'close' | 'reopen' | 'expire' | 'join'
  message: string
  created_at: string
}

export interface DashboardResponse {
  stats: DashboardStats
  polls: PollAnalyticsItem[]
  popular_polls: PollAnalyticsItem[]
  devices: DeviceBreakdown
  geography: GeoItem[]
  timeline: TimelinePoint[]
  recent_activities: ActivityFeedItem[]
  live_viewers: number
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

  open: (id: string, expires_at?: string | null) =>
    api.patch(`/api/polls/${id}/open`, expires_at !== undefined ? { expires_at } : {}),

  duplicate: (id: string) =>
    api.post<Poll>(`/api/polls/${id}/duplicate`),

  export: (id: string, format = 'csv') =>
    api.get(`/api/polls/${id}/export?format=${format}`, { responseType: 'blob' }),

  delete: (id: string) =>
    api.delete(`/api/polls/${id}`),

  getDashboard: () =>
    api.get<DashboardResponse>('/api/dashboard'),
}

// === Vote API ===
export const voteApi = {
  vote: (pollId: string, optionIndex: number) =>
    api.post<ResultsResponse>(`/api/polls/${pollId}/vote`, { option_index: optionIndex }),

  getResults: (pollId: string) =>
    api.get<ResultsResponse>(`/api/polls/${pollId}/results`),

  getTimeline: (pollId: string) =>
    api.get<TimelinePoint[]>(`/api/polls/${pollId}/timeline`),
}

export default api
