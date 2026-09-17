import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import SplashScreen, { SESSION_STORAGE_KEY } from './components/SplashScreen'

import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import DashboardPage  from './pages/DashboardPage'
import CreatePollPage from './pages/CreatePollPage'
import PollSharePage  from './pages/PollSharePage'
import MyPollsPage    from './pages/MyPollsPage'
import PollDetailPage from './pages/PollDetailPage'
import VotingPage     from './pages/VotingPage'
import ResultsPage    from './pages/ResultsPage'

/**
 * App defines the complete routing structure.
 *
 * Public routes  → accessible without authentication
 * Protected routes → wrapped in ProtectedRoute, redirect to /login if no token
 *
 * Route breakdown:
 *   /              Landing page
 *   /login         Login form
 *   /register      Registration form
 *   /poll/:id      Public voting page (no auth needed)
 *   /results/:id   Live results page (no auth needed)
 *   /dashboard     Authenticated dashboard
 *   /polls/create  Authenticated poll creation
 *   /polls/:id/share  Share page shown after poll creation
 */
export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('splash') === '1' || params.get('intro') === '1') return true
      return !sessionStorage.getItem(SESSION_STORAGE_KEY)
    } catch {
      return false
    }
  })

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main>
            <Routes>
              {/* Public */}
              <Route path="/"           element={<LandingPage />} />
              <Route path="/login"      element={<LoginPage />} />
              <Route path="/register"   element={<RegisterPage />} />
              <Route path="/poll/:id"   element={<VotingPage />} />
              <Route path="/results/:id" element={<ResultsPage />} />

              {/* Protected */}
              <Route path="/dashboard" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
              } />
              <Route path="/polls/create" element={
                <ProtectedRoute><CreatePollPage /></ProtectedRoute>
              } />
              <Route path="/polls/:id/share" element={
                <ProtectedRoute><PollSharePage /></ProtectedRoute>
              } />
              <Route path="/polls/:id/detail" element={
                <ProtectedRoute><PollDetailPage /></ProtectedRoute>
              } />
              <Route path="/my-polls" element={
                <ProtectedRoute><MyPollsPage /></ProtectedRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  </>
  )
}
